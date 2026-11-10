import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { asSubject, defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { courses, enrollments, lessons, modules, users } from '@/database/schema'
import {
  buildObjectKey,
  createUploadUrl,
  isAllowedContentType,
  publicUrl,
} from '@/services/storage'
import { uniqueSlug } from '@/utils/slug'

import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/http-errors'

// Mínimo aceito pelo Stripe em BRL é R$ 0,50. Usamos R$ 5,00 como piso de negócio.
const MIN_PRICE_IN_CENTS = 500

const idParam = z.object({ id: z.uuid() })

async function loadCourse(courseId: string) {
  const [course] = await database.select().from(courses).where(eq(courses.id, courseId))
  if (!course) throw new NotFoundError('Curso não encontrado.')
  return course
}

function assertCan(user: AuthUser, action: 'update' | 'delete' | 'publish', course: typeof courses.$inferSelect) {
  if (!defineAbilityFor(user).can(action, asSubject('Course', course))) {
    throw new ForbiddenError('Você não tem permissão para alterar este curso.')
  }
}

async function loadModule(moduleId: string) {
  const [mod] = await database.select().from(modules).where(eq(modules.id, moduleId))
  if (!mod) throw new NotFoundError('Módulo não encontrado.')
  return mod
}

async function loadLesson(lessonId: string) {
  const [lesson] = await database
    .select({ lesson: lessons, courseId: modules.courseId })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(lessons.id, lessonId))
  if (!lesson) throw new NotFoundError('Aula não encontrada.')
  return lesson
}

/** Impede que um curso referencie arquivos de outro curso. */
function assertKeyBelongsToCourse(key: string | null | undefined, courseId: string, folder: 'covers' | 'videos') {
  if (key && !key.startsWith(`courses/${courseId}/${folder}/`)) {
    throw new BadRequestError('Arquivo não pertence a este curso.')
  }
}

const courseSummary = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().nullable(),
  priceInCents: z.number(),
  mentorName: z.string(),
})

async function loadStructure(courseId: string) {
  const mods = await database
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(asc(modules.position))

  const lessonRows = mods.length
    ? await database
        .select()
        .from(lessons)
        .where(
          inArray(
            lessons.moduleId,
            mods.map((m) => m.id),
          ),
        )
        .orderBy(asc(lessons.position))
    : []

  return mods.map((mod) => ({
    id: mod.id,
    title: mod.title,
    position: mod.position,
    lessons: lessonRows
      .filter((lesson) => lesson.moduleId === mod.id)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        durationInSeconds: lesson.durationInSeconds,
        position: lesson.position,
        hasVideo: Boolean(lesson.videoKey),
      })),
  }))
}

const structureSchema = z.array(
  z.object({
    id: z.uuid(),
    title: z.string(),
    position: z.number(),
    lessons: z.array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        durationInSeconds: z.number(),
        position: z.number(),
        hasVideo: z.boolean(),
      }),
    ),
  }),
)

export const courseRoutes: FastifyPluginAsyncZod = async (app) => {
  // Catálogo público
  app.get(
    '/courses',
    { schema: { response: { 200: z.object({ courses: z.array(courseSummary) }) } } },
    async () => {
      const rows = await database
        .select({ course: courses, mentorName: users.name })
        .from(courses)
        .innerJoin(users, eq(users.id, courses.mentorId))
        .where(eq(courses.isPublished, true))
        .orderBy(desc(courses.createdAt))

      return {
        courses: rows.map(({ course, mentorName }) => ({
          id: course.id,
          slug: course.slug,
          title: course.title,
          description: course.description,
          coverUrl: publicUrl(course.coverKey),
          priceInCents: course.priceInCents,
          mentorName,
        })),
      }
    },
  )

  // Detalhe público (sem chaves de vídeo)
  app.get(
    '/courses/:slug',
    {
      schema: {
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            course: courseSummary.extend({ isPublished: z.boolean() }),
            modules: structureSchema,
            isEnrolled: z.boolean(),
            isOwner: z.boolean(),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.optionalUser()
      const [row] = await database
        .select({ course: courses, mentorName: users.name })
        .from(courses)
        .innerJoin(users, eq(users.id, courses.mentorId))
        .where(eq(courses.slug, request.params.slug))

      if (!row) throw new NotFoundError('Curso não encontrado.')

      const { course } = row
      const canSeeDraft = user
        ? defineAbilityFor(user).can('get', asSubject('Course', course)) && !course.isPublished
        : false
      if (!course.isPublished && !canSeeDraft) throw new NotFoundError('Curso não encontrado.')

      let isEnrolled = false
      if (user) {
        const [enrollment] = await database
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id)))
        isEnrolled = Boolean(enrollment)
      }

      return {
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          description: course.description,
          coverUrl: publicUrl(course.coverKey),
          priceInCents: course.priceInCents,
          mentorName: row.mentorName,
          isPublished: course.isPublished,
        },
        modules: await loadStructure(course.id),
        isEnrolled,
        isOwner: user ? defineAbilityFor(user).can('update', asSubject('Course', course)) : false,
      }
    },
  )

  // Cursos do mentor logado
  app.get(
    '/me/courses',
    {
      schema: {
        response: {
          200: z.object({
            courses: z.array(
              z.object({
                id: z.uuid(),
                slug: z.string(),
                title: z.string(),
                priceInCents: z.number(),
                isPublished: z.boolean(),
                coverUrl: z.string().nullable(),
                salesCount: z.number(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('create', 'Course')) {
        throw new ForbiddenError('Apenas mentores têm cursos próprios.')
      }

      const rows = await database
        .select({
          course: courses,
          salesCount: sql<number>`(select count(*) from ${enrollments} where ${enrollments.courseId} = ${courses.id})::int`,
        })
        .from(courses)
        .where(eq(courses.mentorId, user.id))
        .orderBy(desc(courses.createdAt))

      return {
        courses: rows.map(({ course, salesCount }) => ({
          id: course.id,
          slug: course.slug,
          title: course.title,
          priceInCents: course.priceInCents,
          isPublished: course.isPublished,
          coverUrl: publicUrl(course.coverKey),
          salesCount,
        })),
      }
    },
  )

  // Dados completos para edição (inclui rascunho)
  app.get(
    '/courses/:id/edit',
    {
      schema: {
        params: idParam,
        response: {
          200: z.object({
            course: z.object({
              id: z.uuid(),
              slug: z.string(),
              title: z.string(),
              description: z.string().nullable(),
              coverUrl: z.string().nullable(),
              coverKey: z.string().nullable(),
              priceInCents: z.number(),
              isPublished: z.boolean(),
            }),
            modules: structureSchema,
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const course = await loadCourse(request.params.id)
      assertCan(user, 'update', course)

      return {
        course: {
          id: course.id,
          slug: course.slug,
          title: course.title,
          description: course.description,
          coverUrl: publicUrl(course.coverKey),
          coverKey: course.coverKey,
          priceInCents: course.priceInCents,
          isPublished: course.isPublished,
        },
        modules: await loadStructure(course.id),
      }
    },
  )

  app.post(
    '/courses',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: {
        body: z.object({
          title: z.string().trim().min(3),
          description: z.string().trim().optional(),
          priceInCents: z.number().int().min(MIN_PRICE_IN_CENTS),
        }),
        response: { 201: z.object({ courseId: z.uuid(), slug: z.string() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('create', 'Course')) {
        throw new ForbiddenError('Você não tem permissão para criar cursos.')
      }

      const { title, description, priceInCents } = request.body
      const [course] = await database
        .insert(courses)
        .values({ mentorId: user.id, title, description, priceInCents, slug: uniqueSlug(title) })
        .returning()

      return reply.status(201).send({ courseId: course.id, slug: course.slug })
    },
  )

  app.patch(
    '/courses/:id',
    {
      schema: {
        params: idParam,
        body: z.object({
          title: z.string().trim().min(3).optional(),
          description: z.string().trim().nullable().optional(),
          priceInCents: z.number().int().min(MIN_PRICE_IN_CENTS).optional(),
          coverKey: z.string().nullable().optional(),
        }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const course = await loadCourse(request.params.id)
      assertCan(user, 'update', course)
      assertKeyBelongsToCourse(request.body.coverKey, course.id, 'covers')

      await database
        .update(courses)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(courses.id, course.id))

      return reply.status(204).send(null)
    },
  )

  app.post(
    '/courses/:id/publish',
    {
      schema: {
        params: idParam,
        body: z.object({ published: z.boolean() }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const course = await loadCourse(request.params.id)
      assertCan(user, 'publish', course)

      if (request.body.published) {
        const structure = await loadStructure(course.id)
        const hasPlayableLesson = structure.some((mod) => mod.lessons.some((l) => l.hasVideo))
        if (!hasPlayableLesson) {
          throw new BadRequestError('Adicione ao menos uma aula com vídeo antes de publicar.')
        }
      }

      await database
        .update(courses)
        .set({ isPublished: request.body.published, updatedAt: new Date() })
        .where(eq(courses.id, course.id))

      return reply.status(204).send(null)
    },
  )

  app.post(
    '/courses/:id/modules',
    {
      schema: {
        params: idParam,
        body: z.object({ title: z.string().trim().min(2) }),
        response: { 201: z.object({ moduleId: z.uuid() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const course = await loadCourse(request.params.id)
      assertCan(user, 'update', course)

      const [{ next }] = await database
        .select({ next: sql<number>`coalesce(max(${modules.position}), 0) + 1` })
        .from(modules)
        .where(eq(modules.courseId, course.id))

      const [mod] = await database
        .insert(modules)
        .values({ courseId: course.id, title: request.body.title, position: next })
        .returning({ id: modules.id })

      return reply.status(201).send({ moduleId: mod.id })
    },
  )

  app.delete(
    '/modules/:id',
    { schema: { params: idParam, response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      const mod = await loadModule(request.params.id)
      assertCan(user, 'update', await loadCourse(mod.courseId))

      await database.delete(modules).where(eq(modules.id, mod.id))
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/modules/:id/lessons',
    {
      schema: {
        params: idParam,
        body: z.object({
          title: z.string().trim().min(2),
          videoKey: z.string().optional(),
          durationInSeconds: z.number().int().min(0).default(0),
        }),
        response: { 201: z.object({ lessonId: z.uuid() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const mod = await loadModule(request.params.id)
      const course = await loadCourse(mod.courseId)
      assertCan(user, 'update', course)
      assertKeyBelongsToCourse(request.body.videoKey, course.id, 'videos')

      const [{ next }] = await database
        .select({ next: sql<number>`coalesce(max(${lessons.position}), 0) + 1` })
        .from(lessons)
        .where(eq(lessons.moduleId, mod.id))

      const [lesson] = await database
        .insert(lessons)
        .values({
          moduleId: mod.id,
          title: request.body.title,
          videoKey: request.body.videoKey,
          durationInSeconds: request.body.durationInSeconds,
          position: next,
        })
        .returning({ id: lessons.id })

      return reply.status(201).send({ lessonId: lesson.id })
    },
  )

  app.patch(
    '/lessons/:id',
    {
      schema: {
        params: idParam,
        body: z.object({
          title: z.string().trim().min(2).optional(),
          videoKey: z.string().nullable().optional(),
          durationInSeconds: z.number().int().min(0).optional(),
        }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const { lesson, courseId } = await loadLesson(request.params.id)
      assertCan(user, 'update', await loadCourse(courseId))
      assertKeyBelongsToCourse(request.body.videoKey, courseId, 'videos')

      await database.update(lessons).set(request.body).where(eq(lessons.id, lesson.id))
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/lessons/:id',
    { schema: { params: idParam, response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      const { lesson, courseId } = await loadLesson(request.params.id)
      assertCan(user, 'update', await loadCourse(courseId))

      await database.delete(lessons).where(eq(lessons.id, lesson.id))
      return reply.status(204).send(null)
    },
  )

  // Upload direto ao R2 por URL pré-assinada
  app.post(
    '/courses/:id/uploads',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: {
        params: idParam,
        body: z.object({ kind: z.enum(['cover', 'video']), contentType: z.string() }),
        response: { 200: z.object({ uploadUrl: z.string(), key: z.string() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const course = await loadCourse(request.params.id)
      assertCan(user, 'update', course)

      const { kind, contentType } = request.body
      if (!isAllowedContentType(kind, contentType)) {
        throw new BadRequestError('Tipo de arquivo não permitido.')
      }

      const key = buildObjectKey(kind, course.id, contentType)
      return { uploadUrl: await createUploadUrl(key, contentType), key }
    },
  )
}
