import { and, asc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { asSubject, defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { companies, companyMembers, users } from '@/database/schema'
import { memberStatus, newInvite, transferManager } from '@/services/company-access'
import { onlyDigits } from '@/utils/documents'

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'

export const companySizes = ['mei', 'micro', 'small', 'medium', 'large'] as const
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()

export const companyFields = z.object({
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

/** O responsável pela conta (D23) é quem adiciona, remove e troca pessoas. */
async function requireManager(user: AuthUser) {
  if (user.role !== 'company' || !user.companyId) throw new ForbiddenError('Sua conta não está vinculada a uma empresa.')
  const [me] = await database
    .select()
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, user.companyId), eq(companyMembers.userId, user.id)))
  if (!me?.isPrimary) throw new ForbiddenError('Só o responsável pela conta gerencia a equipe.')
  return { companyId: user.companyId, me }
}

export const companyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/company', { schema: { response: { 200: companyResponse } } }, async (request) => {
    const user = await request.requireUser()
    if (user.role !== 'company') throw new ForbiddenError('Disponível só para empresas.')
    return loadCompany(user)
  })

  app.patch(
    '/company',
    { schema: { body: companyFields.omit({ legalName: true }).partial(), response: { 200: companyResponse } } },
    async (request) => {
      const user = await request.requireUser()
      if (!user.companyId || !defineAbilityFor(user).can('update', asSubject('Company', { id: user.companyId }))) {
        throw new ForbiddenError('Sua conta não está vinculada a uma empresa.')
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
      const { companyId } = await requireManager(user)
      const { email, name, jobTitle, phone } = request.body

      const [existingUser] = await database.select({ id: users.id }).from(users).where(eq(users.email, email))
      if (existingUser) throw new ConflictError('Já existe uma conta com este e-mail.')
      const [existingMember] = await database
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.email, email)))
      if (existingMember) throw new ConflictError('Este representante já está na lista.')

      const invite = newInvite()
      const [member] = await database
        .insert(companyMembers)
        .values({
          companyId,
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
      const { companyId } = await requireManager(user)
      const [member] = await database
        .select()
        .from(companyMembers)
        .where(and(eq(companyMembers.id, request.params.id), eq(companyMembers.companyId, companyId)))
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
      const { companyId } = await requireManager(user)

      const [target] = await database
        .select()
        .from(companyMembers)
        .where(and(eq(companyMembers.id, request.params.id), eq(companyMembers.companyId, companyId)))
      if (!target) throw new NotFoundError('Representante não encontrado.')
      if (target.isPrimary) throw new BadRequestError('O responsável pela conta não pode ser removido. Passe a gestão a outra pessoa antes.')

      await database.delete(companyMembers).where(eq(companyMembers.id, target.id))
      return reply.status(204).send(null)
    },
  )

  // D23: a empresa escolhe quem gerencia a conta.
  app.post(
    '/company/manager',
    {
      schema: {
        body: z.object({ memberId: z.uuid() }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const { companyId, me } = await requireManager(user)
      if (me.id === request.body.memberId) throw new BadRequestError('Você já é o responsável pela conta.')
      await transferManager({ companyId, toMemberId: request.body.memberId, changedByUserId: user.id, origin: 'company' })
      return reply.status(204).send(null)
    },
  )
}
