import { and, count, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { certificates, companies, courses, invitations, portfolioItems, studentProfiles, users } from '@/database/schema'

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'
import { listPortfolio, portfolioItemResponse } from './portfolio'

const idParam = z.object({ id: z.uuid() })
const PAGE_SIZE = 12

function assertCompany(user: AuthUser) {
  if (!user.companyId || !defineAbilityFor(user).can('get', 'Talent')) {
    throw new ForbiddenError('Cadastre a sua empresa para acessar o Banco de Talentos.')
  }
  return user.companyId
}

function ageFrom(birthDate: string | null) {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age -= 1
  return age
}

/** Antes do aceite do convite, a empresa vê só o primeiro nome e a inicial do sobrenome (D18). */
function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.` : parts[0]!
}

const talentCard = z.object({
  id: z.uuid(),
  displayName: z.string(),
  headline: z.string().nullable(),
  city: z.string().nullable(),
  neighborhood: z.string().nullable(),
  age: z.number().nullable(),
  interests: z.array(z.string()),
  validatedProjects: z.number(),
  certificates: z.number(),
})

const invitationStatus = z.enum(['sent', 'accepted', 'declined', 'hired', 'withdrawn'])

export const talentRoutes: FastifyPluginAsyncZod = async (app) => {
  // ----- Empresa: buscar talentos -----
  app.get(
    '/talents',
    {
      schema: {
        querystring: z.object({
          q: z.string().trim().max(80).optional(),
          interest: z.string().trim().max(40).optional(),
          city: z.string().trim().max(80).optional(),
          neighborhood: z.string().trim().max(80).optional(),
          page: z.coerce.number().int().min(1).default(1),
        }),
        response: { 200: z.object({ talents: z.array(talentCard), total: z.number(), page: z.number(), pageSize: z.number() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      assertCompany(user)
      const { q, interest, city, neighborhood, page } = request.query

      // Só aparece quem optou por aparecer e tem ao menos 1 projeto validado e público (D18).
      const validatedPerUser = database
        .select({ userId: portfolioItems.userId, total: count().as('total') })
        .from(portfolioItems)
        .where(and(isNotNull(portfolioItems.validatedAt), eq(portfolioItems.isPublic, true)))
        .groupBy(portfolioItems.userId)
        .as('validated')

      const filters = and(
        eq(studentProfiles.talentVisible, true),
        q ? or(ilike(users.name, `%${q}%`), ilike(studentProfiles.headline, `%${q}%`), sql`exists (select 1 from unnest(${studentProfiles.interests}) as i where i ilike ${'%' + q + '%'})`) : undefined,
        interest ? sql`${interest} = any(${studentProfiles.interests})` : undefined,
        city ? ilike(studentProfiles.city, city) : undefined,
        neighborhood ? ilike(studentProfiles.neighborhood, `%${neighborhood}%`) : undefined,
      )

      const [{ total }] = await database
        .select({ total: count() })
        .from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .innerJoin(validatedPerUser, eq(validatedPerUser.userId, studentProfiles.userId))
        .where(filters)

      const rows = await database
        .select({ profile: studentProfiles, name: users.name, validated: validatedPerUser.total })
        .from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .innerJoin(validatedPerUser, eq(validatedPerUser.userId, studentProfiles.userId))
        .where(filters)
        .orderBy(desc(validatedPerUser.total), desc(studentProfiles.updatedAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE)

      const certs = rows.length
        ? await database
            .select({ userId: certificates.userId, total: count() })
            .from(certificates)
            .where(inArray(certificates.userId, rows.map((r) => r.profile.userId)))
            .groupBy(certificates.userId)
        : []

      return {
        total,
        page,
        pageSize: PAGE_SIZE,
        talents: rows.map((r) => ({
          id: r.profile.userId,
          displayName: shortName(r.name),
          headline: r.profile.headline,
          city: r.profile.city,
          neighborhood: r.profile.neighborhood,
          age: ageFrom(r.profile.birthDate),
          interests: r.profile.interests,
          validatedProjects: r.validated,
          certificates: certs.find((c) => c.userId === r.profile.userId)?.total ?? 0,
        })),
      }
    },
  )

  app.get(
    '/talents/:id',
    {
      schema: {
        params: idParam,
        response: {
          200: talentCard.extend({
            fullName: z.string().nullable(),
            bio: z.string().nullable(),
            goal: z.string().nullable(),
            portfolio: z.array(portfolioItemResponse),
            courses: z.array(z.string()),
            invitation: z.object({ id: z.uuid(), status: invitationStatus, roleTitle: z.string() }).nullable(),
            /** Só depois que o talento aceita o convite. */
            contact: z.object({ email: z.string(), phone: z.string().nullable() }).nullable(),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const companyId = assertCompany(user)

      const [row] = await database
        .select({ profile: studentProfiles, user: users })
        .from(studentProfiles)
        .innerJoin(users, eq(users.id, studentProfiles.userId))
        .where(and(eq(studentProfiles.userId, request.params.id), eq(studentProfiles.talentVisible, true)))
      if (!row) throw new NotFoundError('Talento não encontrado.')

      const portfolio = await listPortfolio(row.user.id, true)
      const validated = portfolio.filter((p) => p.validated)
      if (validated.length === 0) throw new NotFoundError('Talento não encontrado.')

      const certRows = await database
        .select({ title: courses.title })
        .from(certificates)
        .innerJoin(courses, eq(courses.id, certificates.courseId))
        .where(eq(certificates.userId, row.user.id))

      const [invite] = await database
        .select()
        .from(invitations)
        .where(and(eq(invitations.companyId, companyId), eq(invitations.studentId, row.user.id)))
        .orderBy(desc(invitations.createdAt))
        .limit(1)

      const revealed = invite && (invite.status === 'accepted' || invite.status === 'hired')
      return {
        id: row.user.id,
        displayName: shortName(row.user.name),
        fullName: revealed ? row.user.name : null,
        headline: row.profile.headline,
        city: row.profile.city,
        neighborhood: row.profile.neighborhood,
        age: ageFrom(row.profile.birthDate),
        interests: row.profile.interests,
        validatedProjects: validated.length,
        certificates: certRows.length,
        bio: row.profile.bio,
        goal: row.profile.goal,
        portfolio,
        courses: certRows.map((c) => c.title),
        invitation: invite ? { id: invite.id, status: invite.status, roleTitle: invite.roleTitle } : null,
        contact: revealed ? { email: row.user.email, phone: row.profile.phone } : null,
      }
    },
  )

  app.post(
    '/talents/:id/invitations',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        params: idParam,
        body: z.object({
          roleTitle: z.string().trim().min(3).max(120),
          message: z.string().trim().min(20, 'Escreva uma mensagem com ao menos 20 caracteres.').max(1500),
        }),
        response: { 201: z.object({ invitationId: z.uuid() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const companyId = assertCompany(user)

      const [target] = await database
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(and(eq(studentProfiles.userId, request.params.id), eq(studentProfiles.talentVisible, true)))
      if (!target) throw new NotFoundError('Talento não encontrado.')

      const [open] = await database
        .select({ id: invitations.id })
        .from(invitations)
        .where(and(eq(invitations.companyId, companyId), eq(invitations.studentId, target.userId), inArray(invitations.status, ['sent', 'accepted', 'hired'])))
      if (open) throw new ConflictError('Você já tem um convite em andamento para este talento.')

      const [created] = await database
        .insert(invitations)
        .values({ companyId, invitedBy: user.id, studentId: target.userId, ...request.body })
        .returning({ id: invitations.id })
      return reply.status(201).send({ invitationId: created!.id })
    },
  )

  app.get(
    '/company/invitations',
    {
      schema: {
        response: {
          200: z.object({
            invitations: z.array(
              z.object({
                id: z.uuid(),
                studentId: z.uuid(),
                studentName: z.string(),
                roleTitle: z.string(),
                status: invitationStatus,
                createdAt: z.date(),
                respondedAt: z.date().nullable(),
                contact: z.object({ email: z.string(), phone: z.string().nullable() }).nullable(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const companyId = assertCompany(user)

      const rows = await database
        .select({ invitation: invitations, student: users, phone: studentProfiles.phone })
        .from(invitations)
        .innerJoin(users, eq(users.id, invitations.studentId))
        .leftJoin(studentProfiles, eq(studentProfiles.userId, invitations.studentId))
        .where(eq(invitations.companyId, companyId))
        .orderBy(desc(invitations.createdAt))
        .limit(100)

      return {
        invitations: rows.map(({ invitation, student, phone }) => {
          const revealed = invitation.status === 'accepted' || invitation.status === 'hired'
          return {
            id: invitation.id,
            studentId: student.id,
            studentName: revealed ? student.name : shortName(student.name),
            roleTitle: invitation.roleTitle,
            status: invitation.status,
            createdAt: invitation.createdAt,
            respondedAt: invitation.respondedAt,
            contact: revealed ? { email: student.email, phone } : null,
          }
        }),
      }
    },
  )

  for (const action of ['withdraw', 'hire'] as const) {
    app.post(
      `/company/invitations/:id/${action}`,
      { schema: { params: idParam, response: { 204: z.null() } } },
      async (request, reply) => {
        const user = await request.requireUser()
        const companyId = assertCompany(user)
        const [invite] = await database.select().from(invitations).where(and(eq(invitations.id, request.params.id), eq(invitations.companyId, companyId)))
        if (!invite) throw new NotFoundError('Convite não encontrado.')

        if (action === 'withdraw' && invite.status !== 'sent') throw new BadRequestError('Só é possível retirar um convite que ainda não foi respondido.')
        if (action === 'hire' && invite.status !== 'accepted') throw new BadRequestError('Só é possível marcar como contratado depois que o talento aceita o convite.')

        await database
          .update(invitations)
          .set({ status: action === 'withdraw' ? 'withdrawn' : 'hired', respondedAt: invite.respondedAt ?? new Date() })
          .where(eq(invitations.id, invite.id))
        return reply.status(204).send(null)
      },
    )
  }

  // ----- Aluno: responder convites -----
  app.get(
    '/me/invitations',
    {
      schema: {
        response: {
          200: z.object({
            invitations: z.array(
              z.object({
                id: z.uuid(),
                companyName: z.string(),
                companySector: z.string(),
                companyCity: z.string(),
                companyAbout: z.string().nullable(),
                roleTitle: z.string(),
                message: z.string(),
                status: invitationStatus,
                createdAt: z.date(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (user.role !== 'student') throw new ForbiddenError('Disponível só para alunos.')

      const rows = await database
        .select({ invitation: invitations, company: companies })
        .from(invitations)
        .innerJoin(companies, eq(companies.id, invitations.companyId))
        .where(and(eq(invitations.studentId, user.id), sql`${invitations.status} <> 'withdrawn'`))
        .orderBy(desc(invitations.createdAt))

      return {
        invitations: rows.map(({ invitation, company }) => ({
          id: invitation.id,
          companyName: company.tradeName,
          companySector: company.sector,
          companyCity: `${company.city}/${company.state}`,
          companyAbout: company.about,
          roleTitle: invitation.roleTitle,
          message: invitation.message,
          status: invitation.status,
          createdAt: invitation.createdAt,
        })),
      }
    },
  )

  app.post(
    '/me/invitations/:id/respond',
    { schema: { params: idParam, body: z.object({ accept: z.boolean() }), response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      if (user.role !== 'student') throw new ForbiddenError('Disponível só para alunos.')

      const [invite] = await database.select().from(invitations).where(and(eq(invitations.id, request.params.id), eq(invitations.studentId, user.id)))
      if (!invite) throw new NotFoundError('Convite não encontrado.')
      if (invite.status !== 'sent') throw new ConflictError('Este convite já foi respondido ou retirado.')

      await database
        .update(invitations)
        .set({ status: request.body.accept ? 'accepted' : 'declined', respondedAt: new Date() })
        .where(eq(invitations.id, invite.id))
      return reply.status(204).send(null)
    },
  )
}
