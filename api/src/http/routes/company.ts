import { createHash, randomBytes } from 'node:crypto'

import { and, asc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { asSubject, defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { companies, companyMembers, users } from '@/database/schema'
import { env } from '@/env'
import { isValidCnpj, onlyDigits } from '@/utils/documents'

import { strictRateLimit } from '../rate-limit'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'

export const companySizes = ['mei', 'micro', 'small', 'medium', 'large'] as const
const INVITE_DAYS = 7

export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex')

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()

const companyFields = z.object({
  legalName: z.string().trim().min(3).max(160),
  tradeName: z.string().trim().min(2).max(120),
  sector: z.string().trim().min(2).max(80),
  size: z.enum(companySizes),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  website: optionalText(200),
  about: optionalText(800),
})

const memberResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  jobTitle: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  isPrimary: z.boolean(),
  /** active: já tem acesso. pending: convite enviado. expired: convite venceu. */
  status: z.enum(['active', 'pending', 'expired']),
})

const companyResponse = z.object({
  id: z.uuid(),
  cnpj: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  sector: z.string(),
  size: z.enum(companySizes),
  city: z.string(),
  state: z.string(),
  website: z.string().nullable(),
  about: z.string().nullable(),
  isOwner: z.boolean(),
  members: z.array(memberResponse),
})

function memberStatus(member: typeof companyMembers.$inferSelect) {
  if (member.userId) return 'active' as const
  return member.inviteExpiresAt && member.inviteExpiresAt < new Date() ? ('expired' as const) : ('pending' as const)
}

async function loadCompany(user: AuthUser) {
  if (!user.companyId) throw new NotFoundError('Sua empresa ainda não foi cadastrada.')
  const [company] = await database.select().from(companies).where(eq(companies.id, user.companyId))
  if (!company) throw new NotFoundError('Empresa não encontrada.')
  const members = await database
    .select()
    .from(companyMembers)
    .where(eq(companyMembers.companyId, company.id))
    .orderBy(asc(companyMembers.createdAt))
  const me = members.find((m) => m.userId === user.id)

  return {
    ...company,
    size: company.size as (typeof companySizes)[number],
    isOwner: Boolean(me?.isPrimary),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      jobTitle: m.jobTitle,
      email: m.email,
      phone: m.phone,
      isPrimary: m.isPrimary,
      status: memberStatus(m),
    })),
  }
}

function newInvite() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    inviteTokenHash: hashInviteToken(token),
    inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    url: `${env.FRONTEND_URL.split(',')[0]!.trim()}/convite/${token}`,
  }
}

export const companyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/company', { schema: { response: { 200: companyResponse } } }, async (request) => {
    const user = await request.requireUser()
    if (user.role !== 'company') throw new ForbiddenError('Disponível só para empresas.')
    return loadCompany(user)
  })

  app.post(
    '/company',
    {
      config: strictRateLimit,
      schema: {
        body: companyFields.extend({
          cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido.'),
          representative: z.object({
            jobTitle: z.string().trim().min(2).max(80),
            phone: z
              .string()
              .transform(onlyDigits)
              .refine((value) => value.length === 10 || value.length === 11, 'Informe o telefone com DDD.'),
          }),
        }),
        response: { 201: z.object({ companyId: z.uuid() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      if (user.role !== 'company') throw new ForbiddenError('Disponível só para empresas.')
      if (user.companyId) throw new ConflictError('Sua empresa já foi cadastrada.')

      const { cnpj, representative, ...fields } = request.body
      const digits = onlyDigits(cnpj)
      const [taken] = await database.select({ id: companies.id }).from(companies).where(eq(companies.cnpj, digits))
      if (taken) {
        throw new ConflictError('Este CNPJ já está cadastrado. Peça um convite ao representante principal da empresa.')
      }

      const [account] = await database.select().from(users).where(eq(users.id, user.id))
      const companyId = await database.transaction(async (tx) => {
        const [company] = await tx.insert(companies).values({ ...fields, cnpj: digits }).returning()
        await tx.insert(companyMembers).values({
          companyId: company!.id,
          userId: user.id,
          name: account!.name,
          jobTitle: representative.jobTitle,
          email: account!.email,
          phone: representative.phone,
          isPrimary: true,
          joinedAt: new Date(),
        })
        return company!.id
      })
      return reply.status(201).send({ companyId })
    },
  )

  app.patch(
    '/company',
    { schema: { body: companyFields.partial(), response: { 200: companyResponse } } },
    async (request) => {
      const user = await request.requireUser()
      if (!user.companyId || !defineAbilityFor(user).can('update', asSubject('Company', { id: user.companyId }))) {
        throw new ForbiddenError('Sua empresa ainda não foi cadastrada.')
      }
      await database
        .update(companies)
        .set({ ...request.body, updatedAt: new Date() })
        .where(eq(companies.id, user.companyId))
      return loadCompany(user)
    },
  )

  app.post(
    '/company/members',
    {
      schema: {
        body: z.object({
          name: z.string().trim().min(2).max(120),
          jobTitle: z.string().trim().min(2).max(80),
          email: z.email().transform((value) => value.toLowerCase()),
          phone: z
            .string()
            .transform(onlyDigits)
            .refine((value) => value === '' || value.length === 10 || value.length === 11, 'Informe o telefone com DDD.')
            .optional(),
        }),
        response: { 201: z.object({ memberId: z.uuid(), inviteUrl: z.string(), inviteExpiresAt: z.date() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      if (user.role !== 'company' || !user.companyId) throw new ForbiddenError('Cadastre a empresa primeiro.')
      const { email, name, jobTitle, phone } = request.body

      const [existingUser] = await database.select({ id: users.id }).from(users).where(eq(users.email, email))
      if (existingUser) throw new ConflictError('Já existe uma conta com este e-mail.')
      const [existingMember] = await database
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, user.companyId), eq(companyMembers.email, email)))
      if (existingMember) throw new ConflictError('Este representante já está na lista.')

      const invite = newInvite()
      const [member] = await database
        .insert(companyMembers)
        .values({
          companyId: user.companyId,
          name,
          jobTitle,
          email,
          phone: phone || null,
          inviteTokenHash: invite.inviteTokenHash,
          inviteExpiresAt: invite.inviteExpiresAt,
        })
        .returning()
      return reply.status(201).send({ memberId: member!.id, inviteUrl: invite.url, inviteExpiresAt: invite.inviteExpiresAt })
    },
  )

  app.post(
    '/company/members/:id/invite',
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        response: { 200: z.object({ inviteUrl: z.string(), inviteExpiresAt: z.date() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (user.role !== 'company' || !user.companyId) throw new ForbiddenError('Cadastre a empresa primeiro.')
      const [member] = await database
        .select()
        .from(companyMembers)
        .where(and(eq(companyMembers.id, request.params.id), eq(companyMembers.companyId, user.companyId)))
      if (!member) throw new NotFoundError('Representante não encontrado.')
      if (member.userId) throw new BadRequestError('Este representante já tem acesso.')

      const invite = newInvite()
      await database
        .update(companyMembers)
        .set({ inviteTokenHash: invite.inviteTokenHash, inviteExpiresAt: invite.inviteExpiresAt })
        .where(eq(companyMembers.id, member.id))
      return { inviteUrl: invite.url, inviteExpiresAt: invite.inviteExpiresAt }
    },
  )

  app.delete(
    '/company/members/:id',
    { schema: { params: z.object({ id: z.uuid() }), response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      if (user.role !== 'company' || !user.companyId) throw new ForbiddenError('Cadastre a empresa primeiro.')

      const members = await database.select().from(companyMembers).where(eq(companyMembers.companyId, user.companyId))
      const me = members.find((m) => m.userId === user.id)
      if (!me?.isPrimary) throw new ForbiddenError('Só o representante principal remove representantes.')

      const target = members.find((m) => m.id === request.params.id)
      if (!target) throw new NotFoundError('Representante não encontrado.')
      if (target.isPrimary) throw new BadRequestError('O representante principal não pode ser removido.')

      await database.delete(companyMembers).where(eq(companyMembers.id, target.id))
      return reply.status(204).send(null)
    },
  )
}
