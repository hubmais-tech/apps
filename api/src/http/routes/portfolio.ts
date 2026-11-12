import { and, count, desc, eq, isNotNull } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { database } from '@/database/connection'
import { certificates, challenges, courses, lessons, modules, portfolioItems, studentProfiles, submissions, users } from '@/database/schema'
import { buildPortfolioKey, createUploadUrl, isAllowedContentType, isAllowedSize, publicUrl } from '@/services/storage'
import { sql } from 'drizzle-orm'

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'

const idParam = z.object({ id: z.uuid() })

const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => /^https?:\/\/\S+\.\S+/i.test(value), 'Informe links que comecem com http:// ou https://.')

const itemBody = z.object({
  title: z.string().trim().min(3).max(120),
  description: z
    .string()
    .trim()
    .max(1500)
    .transform((value) => value || null)
    .nullable()
    .optional(),
  links: z.array(linkSchema).max(5).default([]),
  coverKey: z.string().nullable().optional(),
  isPublic: z.boolean().default(true),
})

export const portfolioItemResponse = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  links: z.array(z.string()),
  coverUrl: z.string().nullable(),
  isPublic: z.boolean(),
  validated: z.boolean(),
  validatedByName: z.string().nullable(),
  validatedAt: z.date().nullable(),
  courseTitle: z.string().nullable(),
})

type ItemRow = {
  item: typeof portfolioItems.$inferSelect
  validatorName: string | null
  courseTitle: string | null
}

export function presentItem({ item, validatorName, courseTitle }: ItemRow) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    links: item.links,
    coverUrl: publicUrl(item.coverKey),
    isPublic: item.isPublic,
    validated: Boolean(item.validatedAt),
    validatedByName: validatorName,
    validatedAt: item.validatedAt,
    courseTitle,
  }
}

/** Itens do portfólio de um aluno, com quem validou e de qual curso veio. */
export async function listPortfolio(userId: string, onlyPublic = false) {
  const rows = await database
    .select({ item: portfolioItems, validatorName: users.name, courseTitle: courses.title })
    .from(portfolioItems)
    .leftJoin(users, eq(users.id, portfolioItems.validatedBy))
    .leftJoin(submissions, eq(submissions.id, portfolioItems.submissionId))
    .leftJoin(challenges, eq(challenges.id, submissions.challengeId))
    .leftJoin(courses, eq(courses.id, challenges.courseId))
    .where(and(eq(portfolioItems.userId, userId), onlyPublic ? eq(portfolioItems.isPublic, true) : undefined))
    .orderBy(desc(portfolioItems.createdAt))
  return rows.map(presentItem)
}

/** Quantidade de projetos validados e públicos: é o que libera o Banco de Talentos (D18). */
export async function validatedCount(userId: string) {
  const [row] = await database
    .select({ total: count() })
    .from(portfolioItems)
    .where(and(eq(portfolioItems.userId, userId), isNotNull(portfolioItems.validatedAt), eq(portfolioItems.isPublic, true)))
  return row?.total ?? 0
}

function assertStudent(role: string) {
  if (role !== 'student') throw new ForbiddenError('O portfólio é dos alunos.')
}

function assertCoverKey(key: string | null | undefined, userId: string) {
  if (key && !key.startsWith(`portfolio/${userId}/`)) throw new BadRequestError('Imagem inválida para este portfólio.')
}

export const portfolioRoutes: FastifyPluginAsyncZod = async (app) => {
  // ----- Certificados -----
  app.get(
    '/me/certificates',
    {
      schema: {
        response: {
          200: z.object({
            certificates: z.array(z.object({ code: z.string(), issuedAt: z.date(), courseTitle: z.string(), courseSlug: z.string(), mentorName: z.string() })),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const rows = await database
        .select({ code: certificates.code, issuedAt: certificates.issuedAt, courseTitle: courses.title, courseSlug: courses.slug, mentorName: users.name })
        .from(certificates)
        .innerJoin(courses, eq(courses.id, certificates.courseId))
        .innerJoin(users, eq(users.id, courses.mentorId))
        .where(eq(certificates.userId, user.id))
        .orderBy(desc(certificates.issuedAt))
      return { certificates: rows }
    },
  )

  // Página pública de validação do certificado. Não expõe e-mail nem outros dados do aluno.
  app.get(
    '/certificates/:code',
    {
      schema: {
        params: z.object({ code: z.string().min(6).max(30) }),
        response: {
          200: z.object({
            code: z.string(),
            issuedAt: z.date(),
            studentName: z.string(),
            courseTitle: z.string(),
            mentorName: z.string(),
            totalHours: z.number(),
            lessonsCount: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const [row] = await database
        .select({ certificate: certificates, course: courses })
        .from(certificates)
        .innerJoin(courses, eq(courses.id, certificates.courseId))
        .where(eq(certificates.code, request.params.code.toUpperCase()))
      if (!row) throw new NotFoundError('Certificado não encontrado. Confira o código.')

      const [student] = await database.select({ name: users.name }).from(users).where(eq(users.id, row.certificate.userId))
      const [mentor] = await database.select({ name: users.name }).from(users).where(eq(users.id, row.course.mentorId))
      const [totals] = await database
        .select({ seconds: sql<number>`coalesce(sum(${lessons.durationInSeconds}), 0)::int`, lessons: count() })
        .from(lessons)
        .innerJoin(modules, eq(modules.id, lessons.moduleId))
        .where(eq(modules.courseId, row.course.id))

      return {
        code: row.certificate.code,
        issuedAt: row.certificate.issuedAt,
        studentName: student?.name ?? '',
        courseTitle: row.course.title,
        mentorName: mentor?.name ?? '',
        totalHours: Math.round(((totals?.seconds ?? 0) / 3600) * 10) / 10,
        lessonsCount: totals?.lessons ?? 0,
      }
    },
  )

  // ----- Portfólio -----
  app.get('/me/portfolio', { schema: { response: { 200: z.object({ items: z.array(portfolioItemResponse) }) } } }, async (request) => {
    const user = await request.requireUser()
    assertStudent(user.role)
    return { items: await listPortfolio(user.id) }
  })

  app.post(
    '/me/portfolio/uploads',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        body: z.object({ contentType: z.string(), size: z.number().int().positive() }),
        response: { 200: z.object({ uploadUrl: z.string(), key: z.string() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      assertStudent(user.role)
      const { contentType, size } = request.body
      if (!isAllowedContentType('cover', contentType)) throw new BadRequestError('Envie uma imagem JPG, PNG ou WebP.')
      if (!isAllowedSize('cover', size)) throw new BadRequestError('A imagem pode ter no máximo 5 MB.')
      const key = buildPortfolioKey(user.id, contentType)
      return { uploadUrl: await createUploadUrl(key, contentType, size), key }
    },
  )

  app.post(
    '/me/portfolio',
    { schema: { body: itemBody, response: { 201: z.object({ id: z.uuid() }) } } },
    async (request, reply) => {
      const user = await request.requireUser()
      assertStudent(user.role)
      assertCoverKey(request.body.coverKey, user.id)
      const [item] = await database.insert(portfolioItems).values({ userId: user.id, ...request.body }).returning({ id: portfolioItems.id })
      return reply.status(201).send({ id: item!.id })
    },
  )

  // Transforma uma entrega aprovada em item validado (D17). A validação vem do mentor que aprovou.
  app.post(
    '/me/portfolio/from-submission/:id',
    { schema: { params: idParam, response: { 201: z.object({ id: z.uuid() }) } } },
    async (request, reply) => {
      const user = await request.requireUser()
      assertStudent(user.role)

      const [row] = await database
        .select({ submission: submissions, challengeTitle: challenges.title })
        .from(submissions)
        .innerJoin(challenges, eq(challenges.id, submissions.challengeId))
        .where(and(eq(submissions.id, request.params.id), eq(submissions.userId, user.id)))
      if (!row) throw new NotFoundError('Entrega não encontrada.')
      if (row.submission.status !== 'approved') throw new BadRequestError('Só entregas aprovadas podem ir para o portfólio.')

      const [existing] = await database.select({ id: portfolioItems.id }).from(portfolioItems).where(eq(portfolioItems.submissionId, row.submission.id))
      if (existing) throw new ConflictError('Esta entrega já está no seu portfólio.')

      const [item] = await database
        .insert(portfolioItems)
        .values({
          userId: user.id,
          title: row.challengeTitle,
          description: row.submission.content.slice(0, 1500),
          links: row.submission.links,
          submissionId: row.submission.id,
          validatedBy: row.submission.reviewedBy,
          validatedAt: row.submission.reviewedAt ?? new Date(),
        })
        .returning({ id: portfolioItems.id })
      return reply.status(201).send({ id: item!.id })
    },
  )

  app.patch(
    '/me/portfolio/:id',
    { schema: { params: idParam, body: itemBody.partial(), response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      assertStudent(user.role)
      assertCoverKey(request.body.coverKey, user.id)
      const updated = await database
        .update(portfolioItems)
        .set(request.body)
        .where(and(eq(portfolioItems.id, request.params.id), eq(portfolioItems.userId, user.id)))
        .returning({ id: portfolioItems.id })
      if (updated.length === 0) throw new NotFoundError('Projeto não encontrado.')

      // Esconder o último projeto validado tira o aluno do Banco de Talentos.
      if ((await validatedCount(user.id)) === 0) await database.update(studentProfiles).set({ talentVisible: false }).where(eq(studentProfiles.userId, user.id))
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/me/portfolio/:id',
    { schema: { params: idParam, response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      assertStudent(user.role)
      const removed = await database
        .delete(portfolioItems)
        .where(and(eq(portfolioItems.id, request.params.id), eq(portfolioItems.userId, user.id)))
        .returning({ id: portfolioItems.id })
      if (removed.length === 0) throw new NotFoundError('Projeto não encontrado.')

      if ((await validatedCount(user.id)) === 0) await database.update(studentProfiles).set({ talentVisible: false }).where(eq(studentProfiles.userId, user.id))
      return reply.status(204).send(null)
    },
  )

  // ----- Visibilidade no Banco de Talentos (D18) -----
  app.get(
    '/me/talent',
    { schema: { response: { 200: z.object({ visible: z.boolean(), validatedProjects: z.number(), eligible: z.boolean(), hasHeadline: z.boolean() }) } } },
    async (request) => {
      const user = await request.requireUser()
      assertStudent(user.role)
      const [profile] = await database.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id))
      const validated = await validatedCount(user.id)
      return { visible: Boolean(profile?.talentVisible) && validated > 0, validatedProjects: validated, eligible: validated > 0, hasHeadline: Boolean(profile?.headline) }
    },
  )

  app.put(
    '/me/talent',
    { schema: { body: z.object({ visible: z.boolean() }), response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      assertStudent(user.role)
      if (request.body.visible && (await validatedCount(user.id)) === 0) {
        throw new BadRequestError('Para aparecer no Banco de Talentos, você precisa de pelo menos 1 projeto validado por um mentor.')
      }
      await database
        .insert(studentProfiles)
        .values({ userId: user.id, talentVisible: request.body.visible })
        .onConflictDoUpdate({ target: studentProfiles.userId, set: { talentVisible: request.body.visible, updatedAt: new Date() } })
      return reply.status(204).send(null)
    },
  )
}
