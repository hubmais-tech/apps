import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { asSubject, defineAbilityFor } from '@/auth'
import { database } from '@/database/connection'
import { challenges, courses, submissions, users, type Attachment } from '@/database/schema'
import { isEnrolled } from '@/services/access'
import { issueCertificateIfComplete } from '@/services/certificates'
import { buildAttachmentKey, createReadUrl, createUploadUrl, isAllowedContentType, isAllowedSize } from '@/services/storage'

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'

const idParam = z.object({ id: z.uuid() })

const challengeBody = z.object({
  title: z.string().trim().min(3).max(120),
  brief: z.string().trim().min(10, 'Explique o desafio com ao menos 10 caracteres.').max(3000),
  criteria: z
    .string()
    .trim()
    .max(1500)
    .transform((value) => value || null)
    .nullable()
    .optional(),
})

const attachmentSchema = z.object({
  key: z.string(),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().positive(),
  contentType: z.string(),
})

const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => /^https?:\/\/\S+\.\S+/i.test(value), 'Informe links que comecem com http:// ou https://.')

const submissionResponse = z.object({
  id: z.uuid(),
  status: z.enum(['submitted', 'changes_requested', 'approved']),
  attempt: z.number(),
  content: z.string(),
  links: z.array(z.string()),
  attachments: z.array(attachmentSchema.extend({ url: z.string() })),
  feedback: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  updatedAt: z.date(),
})

async function presentSubmission(row: typeof submissions.$inferSelect) {
  return {
    id: row.id,
    status: row.status,
    attempt: row.attempt,
    content: row.content,
    links: row.links,
    attachments: await Promise.all(row.attachments.map(async (a) => ({ ...a, url: await createReadUrl(a.key) }))),
    feedback: row.feedback,
    reviewedAt: row.reviewedAt,
    updatedAt: row.updatedAt,
  }
}

async function loadChallenge(id: string) {
  const [row] = await database
    .select({ challenge: challenges, course: courses })
    .from(challenges)
    .innerJoin(courses, eq(courses.id, challenges.courseId))
    .where(eq(challenges.id, id))
  if (!row) throw new NotFoundError('Desafio não encontrado.')
  return row
}

export const challengeRoutes: FastifyPluginAsyncZod = async (app) => {
  // ----- Mentor: gerenciar desafios do curso -----
  app.get(
    '/courses/:id/challenges',
    {
      schema: {
        params: idParam,
        response: {
          200: z.object({
            challenges: z.array(
              z.object({
                id: z.uuid(),
                title: z.string(),
                brief: z.string(),
                criteria: z.string().nullable(),
                submissionsCount: z.number(),
                pendingCount: z.number(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const [course] = await database.select().from(courses).where(eq(courses.id, request.params.id))
      if (!course) throw new NotFoundError('Curso não encontrado.')
      if (!defineAbilityFor(user).can('update', asSubject('Course', course))) throw new ForbiddenError('Você não tem permissão para ver os desafios deste curso.')

      const rows = await database.select().from(challenges).where(eq(challenges.courseId, course.id)).orderBy(asc(challenges.position), asc(challenges.createdAt))
      const subs = rows.length
        ? await database.select({ challengeId: submissions.challengeId, status: submissions.status }).from(submissions).where(inArray(submissions.challengeId, rows.map((c) => c.id)))
        : []

      return {
        challenges: rows.map((c) => ({
          id: c.id,
          title: c.title,
          brief: c.brief,
          criteria: c.criteria,
          submissionsCount: subs.filter((s) => s.challengeId === c.id).length,
          pendingCount: subs.filter((s) => s.challengeId === c.id && s.status === 'submitted').length,
        })),
      }
    },
  )

  app.post(
    '/courses/:id/challenges',
    { schema: { params: idParam, body: challengeBody, response: { 201: z.object({ challengeId: z.uuid() }) } } },
    async (request, reply) => {
      const user = await request.requireUser()
      const [course] = await database.select().from(courses).where(eq(courses.id, request.params.id))
      if (!course) throw new NotFoundError('Curso não encontrado.')
      if (!defineAbilityFor(user).can('update', asSubject('Course', course))) throw new ForbiddenError('Você não tem permissão para alterar este curso.')

      const [{ total }] = await database.select({ total: count() }).from(challenges).where(eq(challenges.courseId, course.id))
      const [challenge] = await database
        .insert(challenges)
        .values({ courseId: course.id, ...request.body, position: total + 1 })
        .returning({ id: challenges.id })
      return reply.status(201).send({ challengeId: challenge!.id })
    },
  )

  app.patch(
    '/challenges/:id',
    { schema: { params: idParam, body: challengeBody.partial(), response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      const { challenge, course } = await loadChallenge(request.params.id)
      if (!defineAbilityFor(user).can('update', asSubject('Course', course))) throw new ForbiddenError('Você não tem permissão para alterar este curso.')
      await database.update(challenges).set(request.body).where(eq(challenges.id, challenge.id))
      return reply.status(204).send(null)
    },
  )

  app.delete(
    '/challenges/:id',
    { schema: { params: idParam, response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      const { challenge, course } = await loadChallenge(request.params.id)
      if (!defineAbilityFor(user).can('update', asSubject('Course', course))) throw new ForbiddenError('Você não tem permissão para alterar este curso.')

      const [{ total }] = await database.select({ total: count() }).from(submissions).where(eq(submissions.challengeId, challenge.id))
      if (total > 0) throw new ConflictError('Este desafio já tem entregas e não pode ser removido.')

      await database.delete(challenges).where(eq(challenges.id, challenge.id))
      return reply.status(204).send(null)
    },
  )

  // ----- Aluno: entregar -----
  app.post(
    '/challenges/:id/uploads',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        params: idParam,
        body: z.object({ contentType: z.string(), size: z.number().int().positive() }),
        response: { 200: z.object({ uploadUrl: z.string(), key: z.string() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const { challenge, course } = await loadChallenge(request.params.id)
      if (!(await isEnrolled(user.id, course.id))) throw new ForbiddenError('Matricule-se no curso para entregar este desafio.')

      const { contentType, size } = request.body
      if (!isAllowedContentType('attachment', contentType)) throw new BadRequestError('Envie imagem, PDF ou ZIP.')
      if (!isAllowedSize('attachment', size)) throw new BadRequestError('O arquivo pode ter no máximo 25 MB.')

      const key = buildAttachmentKey(challenge.id, user.id, contentType)
      return { uploadUrl: await createUploadUrl(key, contentType, size), key }
    },
  )

  app.get(
    '/challenges/:id/submission',
    { schema: { params: idParam, response: { 200: submissionResponse.nullable() } } },
    async (request) => {
      const user = await request.requireUser()
      const [row] = await database.select().from(submissions).where(and(eq(submissions.challengeId, request.params.id), eq(submissions.userId, user.id)))
      return row ? presentSubmission(row) : null
    },
  )

  app.put(
    '/challenges/:id/submission',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        params: idParam,
        body: z.object({
          content: z.string().trim().min(10, 'Conte o que você fez (mínimo de 10 caracteres).').max(5000),
          links: z.array(linkSchema).max(5).default([]),
          attachments: z.array(attachmentSchema).max(5).default([]),
        }),
        response: { 200: submissionResponse },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const { challenge, course } = await loadChallenge(request.params.id)
      if (!(await isEnrolled(user.id, course.id))) throw new ForbiddenError('Matricule-se no curso para entregar este desafio.')

      const prefix = `submissions/${challenge.id}/${user.id}/`
      if (request.body.attachments.some((a) => !a.key.startsWith(prefix))) throw new BadRequestError('Arquivo inválido para esta entrega.')

      const [existing] = await database.select().from(submissions).where(and(eq(submissions.challengeId, challenge.id), eq(submissions.userId, user.id)))
      if (existing?.status === 'approved') throw new ConflictError('Esta entrega já foi aprovada e não pode ser alterada.')

      const values = {
        content: request.body.content,
        links: request.body.links,
        attachments: request.body.attachments as Attachment[],
        status: 'submitted' as const,
        feedback: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      }

      const [row] = existing
        ? await database
            .update(submissions)
            .set({ ...values, attempt: existing.status === 'changes_requested' ? existing.attempt + 1 : existing.attempt })
            .where(eq(submissions.id, existing.id))
            .returning()
        : await database.insert(submissions).values({ challengeId: challenge.id, userId: user.id, ...values }).returning()

      return presentSubmission(row!)
    },
  )

  // ----- Mentor: corrigir entregas -----
  app.get(
    '/me/reviews',
    {
      schema: {
        querystring: z.object({ status: z.enum(['pending', 'all']).default('pending') }),
        response: {
          200: z.object({
            reviews: z.array(
              submissionResponse.extend({
                challengeTitle: z.string(),
                courseTitle: z.string(),
                studentName: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (user.role !== 'mentor' && user.role !== 'admin') throw new ForbiddenError('Disponível só para mentores.')
      if (user.role === 'mentor' && !user.walletOpened) throw new ForbiddenError('Abra a carteira para acessar as entregas.')

      const rows = await database
        .select({ submission: submissions, challengeTitle: challenges.title, courseTitle: courses.title, studentName: users.name })
        .from(submissions)
        .innerJoin(challenges, eq(challenges.id, submissions.challengeId))
        .innerJoin(courses, eq(courses.id, challenges.courseId))
        .innerJoin(users, eq(users.id, submissions.userId))
        .where(
          and(
            user.role === 'mentor' ? eq(courses.mentorId, user.id) : undefined,
            request.query.status === 'pending' ? eq(submissions.status, 'submitted') : undefined,
          ),
        )
        .orderBy(desc(submissions.updatedAt))
        .limit(100)

      return {
        reviews: await Promise.all(
          rows.map(async (r) => ({ ...(await presentSubmission(r.submission)), challengeTitle: r.challengeTitle, courseTitle: r.courseTitle, studentName: r.studentName })),
        ),
      }
    },
  )

  app.post(
    '/submissions/:id/review',
    {
      schema: {
        params: idParam,
        body: z.discriminatedUnion('decision', [
          z.object({ decision: z.literal('approve'), feedback: z.string().trim().max(2000).optional() }),
          z.object({ decision: z.literal('request_changes'), feedback: z.string().trim().min(10, 'Explique o que precisa ajustar (mínimo de 10 caracteres).').max(2000) }),
        ]),
        response: { 200: z.object({ status: z.enum(['approved', 'changes_requested']), certificateCode: z.string().nullable() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const [row] = await database
        .select({ submission: submissions, course: courses })
        .from(submissions)
        .innerJoin(challenges, eq(challenges.id, submissions.challengeId))
        .innerJoin(courses, eq(courses.id, challenges.courseId))
        .where(eq(submissions.id, request.params.id))
      if (!row) throw new NotFoundError('Entrega não encontrada.')
      if (!defineAbilityFor(user).can('update', asSubject('Course', row.course))) throw new ForbiddenError('Só o mentor do curso corrige as entregas.')
      if (row.submission.status !== 'submitted') throw new ConflictError('Esta entrega já foi corrigida. Aguarde o aluno reenviar.')

      const approved = request.body.decision === 'approve'
      await database
        .update(submissions)
        .set({ status: approved ? 'approved' : 'changes_requested', feedback: request.body.feedback || null, reviewedBy: user.id, reviewedAt: new Date(), updatedAt: new Date() })
        .where(eq(submissions.id, row.submission.id))

      // Aprovar o último desafio pode concluir o curso (D16).
      const issued = approved ? await issueCertificateIfComplete(row.submission.userId, row.course.id) : null
      return { status: approved ? ('approved' as const) : ('changes_requested' as const), certificateCode: issued?.certificate?.code ?? null }
    },
  )

}
