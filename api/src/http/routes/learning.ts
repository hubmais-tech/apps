import { and, asc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { database } from '@/database/connection'
import {
  certificates,
  challenges,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  modules,
  submissions,
  users,
} from '@/database/schema'
import { canAccessCourse } from '@/services/access'
import { getCompletion, issueCertificateIfComplete } from '@/services/certificates'
import { createReadUrl, publicUrl } from '@/services/storage'

import { ForbiddenError, NotFoundError } from '../errors/http-errors'

async function isStudent(userId: string, courseId: string) {
  const [enrollment] = await database
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
  return Boolean(enrollment)
}

export const learningRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me/enrollments',
    {
      schema: {
        response: {
          200: z.object({
            enrollments: z.array(
              z.object({
                courseId: z.uuid(),
                slug: z.string(),
                title: z.string(),
                coverUrl: z.string().nullable(),
                mentorName: z.string(),
                totalLessons: z.number(),
                completedLessons: z.number(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()

      const rows = await database
        .select({ course: courses, mentorName: users.name })
        .from(enrollments)
        .innerJoin(courses, eq(courses.id, enrollments.courseId))
        .innerJoin(users, eq(users.id, courses.mentorId))
        .where(eq(enrollments.userId, user.id))

      if (rows.length === 0) return { enrollments: [] }

      const courseIds = rows.map((r) => r.course.id)
      const lessonRows = await database
        .select({ id: lessons.id, courseId: modules.courseId })
        .from(lessons)
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .where(inArray(modules.courseId, courseIds))

      const done = await database
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, user.id))
      const doneSet = new Set(done.map((d) => d.lessonId))

      return {
        enrollments: rows.map(({ course, mentorName }) => {
          const own = lessonRows.filter((l) => l.courseId === course.id)
          return {
            courseId: course.id,
            slug: course.slug,
            title: course.title,
            coverUrl: publicUrl(course.coverKey),
            mentorName,
            totalLessons: own.length,
            completedLessons: own.filter((l) => doneSet.has(l.id)).length,
          }
        }),
      }
    },
  )

  // Estrutura do curso para o player, com progresso. Exige matrícula (ou ser o mentor dono).
  app.get(
    '/courses/:slug/learn',
    {
      schema: {
        params: z.object({ slug: z.string() }),
        response: {
          200: z.object({
            course: z.object({ id: z.uuid(), title: z.string(), slug: z.string() }),
            completion: z.object({
              totalLessons: z.number(),
              completedLessons: z.number(),
              totalChallenges: z.number(),
              approvedChallenges: z.number(),
              complete: z.boolean(),
            }),
            certificateCode: z.string().nullable(),
            challenges: z.array(
              z.object({
                id: z.uuid(),
                title: z.string(),
                brief: z.string(),
                criteria: z.string().nullable(),
                submission: z
                  .object({
                    id: z.uuid(),
                    status: z.enum(['submitted', 'changes_requested', 'approved']),
                    attempt: z.number(),
                    feedback: z.string().nullable(),
                  })
                  .nullable(),
              }),
            ),
            modules: z.array(
              z.object({
                id: z.uuid(),
                title: z.string(),
                lessons: z.array(
                  z.object({
                    id: z.uuid(),
                    title: z.string(),
                    durationInSeconds: z.number(),
                    hasVideo: z.boolean(),
                    completed: z.boolean(),
                  }),
                ),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const [course] = await database.select().from(courses).where(eq(courses.slug, request.params.slug))
      if (!course) throw new NotFoundError('Curso não encontrado.')
      if (!(await canAccessCourse(user, course))) {
        throw new ForbiddenError('Você ainda não tem acesso a este curso.')
      }

      const mods = await database
        .select()
        .from(modules)
        .where(eq(modules.courseId, course.id))
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

      const done = await database
        .select({ lessonId: lessonProgress.lessonId })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, user.id))
      const doneSet = new Set(done.map((d) => d.lessonId))

      const challengeRows = await database.select().from(challenges).where(eq(challenges.courseId, course.id)).orderBy(asc(challenges.position), asc(challenges.createdAt))
      const mySubmissions = challengeRows.length
        ? await database
            .select()
            .from(submissions)
            .where(and(eq(submissions.userId, user.id), inArray(submissions.challengeId, challengeRows.map((c) => c.id))))
        : []
      const [certificate] = await database.select().from(certificates).where(and(eq(certificates.userId, user.id), eq(certificates.courseId, course.id)))

      return {
        course: { id: course.id, title: course.title, slug: course.slug },
        completion: await getCompletion(database, user.id, course.id),
        certificateCode: certificate?.code ?? null,
        challenges: challengeRows.map((c) => {
          const mine = mySubmissions.find((s) => s.challengeId === c.id)
          return {
            id: c.id,
            title: c.title,
            brief: c.brief,
            criteria: c.criteria,
            submission: mine ? { id: mine.id, status: mine.status, attempt: mine.attempt, feedback: mine.feedback } : null,
          }
        }),
        modules: mods.map((mod) => ({
          id: mod.id,
          title: mod.title,
          lessons: lessonRows
            .filter((lesson) => lesson.moduleId === mod.id)
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              durationInSeconds: lesson.durationInSeconds,
              hasVideo: Boolean(lesson.videoKey),
              completed: doneSet.has(lesson.id),
            })),
        })),
      }
    },
  )

  app.get(
    '/lessons/:id/video-url',
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        response: { 200: z.object({ url: z.string() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const [row] = await database
        .select({ lesson: lessons, course: courses })
        .from(lessons)
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .innerJoin(courses, eq(courses.id, modules.courseId))
        .where(eq(lessons.id, request.params.id))

      if (!row || !row.lesson.videoKey) throw new NotFoundError('Vídeo não encontrado.')
      if (!(await canAccessCourse(user, row.course))) {
        throw new ForbiddenError('Você ainda não tem acesso a este curso.')
      }

      return { url: await createReadUrl(row.lesson.videoKey) }
    },
  )

  app.post(
    '/lessons/:id/complete',
    {
      schema: { params: z.object({ id: z.uuid() }), response: { 200: z.object({ certificateCode: z.string().nullable() }) } },
    },
    async (request) => {
      const user = await request.requireUser()
      const [row] = await database
        .select({ course: courses })
        .from(lessons)
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .innerJoin(courses, eq(courses.id, modules.courseId))
        .where(eq(lessons.id, request.params.id))

      if (!row) throw new NotFoundError('Aula não encontrada.')
      if (!(await canAccessCourse(user, row.course))) {
        throw new ForbiddenError('Você ainda não tem acesso a este curso.')
      }

      await database
        .insert(lessonProgress)
        .values({ userId: user.id, lessonId: request.params.id })
        .onConflictDoNothing()

      // Só o aluno matriculado ganha certificado, e só se concluiu aulas e desafios (D16).
      const issued = (await isStudent(user.id, row.course.id)) ? await issueCertificateIfComplete(user.id, row.course.id) : null
      return { certificateCode: issued?.certificate?.code ?? null }
    },
  )
}
