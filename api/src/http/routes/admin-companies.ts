import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { companies, companyManagerChanges, companyMembers, users } from '@/database/schema'
import { memberStatus, newInvite, transferManager } from '@/services/company-access'
import { isValidCnpj, onlyDigits } from '@/utils/documents'

import { strictRateLimit } from '../rate-limit'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'
import { companyFields, companySizes } from './company'

/**
 * Cadastro de empresas feito pelo Hub+ (D23). Só o admin.
 * Pede `manage`, e não `get` ou `update`: a empresa tem essas ações com condição (só a própria empresa),
 * e o CASL as aceita quando o subject vem sem objeto.
 */
function assertAdmin(user: AuthUser) {
  if (!defineAbilityFor(user).can('manage', 'Company')) throw new ForbiddenError('Acesso restrito ao admin.')
}

const phoneField = z
  .string()
  .transform(onlyDigits)
  .refine((value) => value.length === 10 || value.length === 11, 'Informe o telefone com DDD.')

const memberStatusSchema = z.enum(['active', 'pending', 'expired'])

/** Estado do acesso da empresa, pelo responsável principal. */
const companyStatusSchema = z.enum(['active', 'pending', 'expired', 'no_manager'])

const memberSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  jobTitle: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  isPrimary: z.boolean(),
  status: memberStatusSchema,
})

const summarySchema = z.object({
  id: z.uuid(),
  cnpj: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  city: z.string(),
  state: z.string(),
  createdAt: z.date(),
  status: companyStatusSchema,
  manager: z.object({ name: z.string(), email: z.string(), jobTitle: z.string() }).nullable(),
  membersCount: z.number(),
})

const inviteResponse = z.object({ inviteUrl: z.string(), inviteExpiresAt: z.date() })

function statusOf(members: (typeof companyMembers.$inferSelect)[]) {
  const manager = members.find((m) => m.isPrimary)
  return { manager, status: manager ? memberStatus(manager) : ('no_manager' as const) }
}

export const adminCompanyRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/admin/companies',
    {
      config: strictRateLimit,
      schema: {
        body: companyFields.extend({
          cnpj: z.string().refine(isValidCnpj, 'CNPJ inválido.'),
          /** Pessoa que a empresa indicou para gerenciar a conta. Recebe o convite. */
          manager: z.object({
            name: z.string().trim().min(2).max(120),
            jobTitle: z.string().trim().min(2).max(80),
            email: z.email().transform((value) => value.toLowerCase()),
            phone: phoneField,
          }),
        }),
        response: { 201: z.object({ companyId: z.uuid(), memberId: z.uuid(), inviteUrl: z.string(), inviteExpiresAt: z.date() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      assertAdmin(user)

      const { cnpj, manager, ...fields } = request.body
      const digits = onlyDigits(cnpj)

      const [taken] = await database.select({ id: companies.id }).from(companies).where(eq(companies.cnpj, digits))
      if (taken) throw new ConflictError('Já existe cadastro para este CNPJ. Cada empresa tem um cadastro só.')
      const [existingUser] = await database.select({ id: users.id }).from(users).where(eq(users.email, manager.email))
      if (existingUser) throw new ConflictError('Já existe uma conta com o e-mail do responsável.')

      const invite = newInvite()
      const created = await database.transaction(async (tx) => {
        const [company] = await tx
          .insert(companies)
          .values({ ...fields, cnpj: digits, createdByUserId: user.id })
          .returning()
        const [member] = await tx
          .insert(companyMembers)
          .values({
            companyId: company!.id,
            name: manager.name,
            jobTitle: manager.jobTitle,
            email: manager.email,
            phone: manager.phone,
            isPrimary: true,
            inviteTokenHash: invite.inviteTokenHash,
            inviteExpiresAt: invite.inviteExpiresAt,
          })
          .returning()
        return { companyId: company!.id, memberId: member!.id }
      })

      return reply.status(201).send({ ...created, inviteUrl: invite.url, inviteExpiresAt: invite.inviteExpiresAt })
    },
  )

  app.get(
    '/admin/companies',
    {
      schema: {
        querystring: z.object({ status: companyStatusSchema.optional(), q: z.string().trim().max(120).optional() }),
        response: { 200: z.object({ companies: z.array(summarySchema) }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      assertAdmin(user)

      const rows = await database.select().from(companies).orderBy(desc(companies.createdAt))
      const members = rows.length
        ? await database
            .select()
            .from(companyMembers)
            .where(
              inArray(
                companyMembers.companyId,
                rows.map((c) => c.id),
              ),
            )
        : []

      const term = request.query.q?.toLowerCase()
      const list = rows
        .map((company) => {
          const mine = members.filter((m) => m.companyId === company.id)
          const { manager, status } = statusOf(mine)
          return {
            id: company.id,
            cnpj: company.cnpj,
            legalName: company.legalName,
            tradeName: company.tradeName,
            city: company.city,
            state: company.state,
            createdAt: company.createdAt,
            status,
            manager: manager ? { name: manager.name, email: manager.email, jobTitle: manager.jobTitle } : null,
            membersCount: mine.length,
          }
        })
        .filter((c) => !request.query.status || c.status === request.query.status)
        .filter((c) => !term || [c.tradeName, c.legalName, c.cnpj, c.manager?.email ?? '', c.manager?.name ?? ''].some((v) => v.toLowerCase().includes(term)))

      return { companies: list }
    },
  )

  app.get(
    '/admin/companies/:id',
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        response: {
          200: summarySchema.omit({ manager: true, membersCount: true }).extend({
            size: z.enum(companySizes),
            sector: z.string(),
            website: z.string().nullable(),
            about: z.string().nullable(),
            members: z.array(memberSchema),
            managerChanges: z.array(
              z.object({
                id: z.uuid(),
                createdAt: z.date(),
                origin: z.enum(['company', 'admin']),
                fromName: z.string().nullable(),
                toName: z.string().nullable(),
                note: z.string().nullable(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      assertAdmin(user)

      const [company] = await database.select().from(companies).where(eq(companies.id, request.params.id))
      if (!company) throw new NotFoundError('Empresa não encontrada.')
      const members = await database.select().from(companyMembers).where(eq(companyMembers.companyId, company.id)).orderBy(asc(companyMembers.createdAt))
      const changes = await database
        .select()
        .from(companyManagerChanges)
        .where(eq(companyManagerChanges.companyId, company.id))
        .orderBy(desc(companyManagerChanges.createdAt))
      const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name ?? null

      return {
        ...company,
        size: company.size as (typeof companySizes)[number],
        status: statusOf(members).status,
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          jobTitle: m.jobTitle,
          email: m.email,
          phone: m.phone,
          isPrimary: m.isPrimary,
          status: memberStatus(m),
        })),
        managerChanges: changes.map((c) => ({
          id: c.id,
          createdAt: c.createdAt,
          origin: c.origin as 'company' | 'admin',
          fromName: nameOf(c.fromMemberId),
          toName: nameOf(c.toMemberId),
          note: c.note,
        })),
      }
    },
  )

  // Reenvia o convite de quem ainda não ativou o acesso. O link anterior deixa de valer.
  app.post(
    '/admin/companies/:id/members/:memberId/invite',
    {
      config: strictRateLimit,
      schema: { params: z.object({ id: z.uuid(), memberId: z.uuid() }), response: { 200: inviteResponse } },
    },
    async (request) => {
      const user = await request.requireUser()
      assertAdmin(user)

      const [member] = await database
        .select()
        .from(companyMembers)
        .where(and(eq(companyMembers.id, request.params.memberId), eq(companyMembers.companyId, request.params.id)))
      if (!member) throw new NotFoundError('Representante não encontrado.')
      if (member.userId) throw new BadRequestError('Esta pessoa já ativou o acesso.')

      const invite = newInvite()
      await database
        .update(companyMembers)
        .set({ inviteTokenHash: invite.inviteTokenHash, inviteExpiresAt: invite.inviteExpiresAt })
        .where(eq(companyMembers.id, member.id))
      return { inviteUrl: invite.url, inviteExpiresAt: invite.inviteExpiresAt }
    },
  )

  // O responsável saiu da empresa: o Hub+ indica outro, a pedido da empresa, e registra o pedido.
  app.post(
    '/admin/companies/:id/manager',
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        body: z.object({
          memberId: z.uuid(),
          /** Quem da empresa pediu a troca e o motivo. Fica no histórico da empresa. */
          note: z.string().trim().min(5, 'Registre quem pediu a troca e o motivo.').max(500),
        }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      assertAdmin(user)

      const [company] = await database.select({ id: companies.id }).from(companies).where(eq(companies.id, request.params.id))
      if (!company) throw new NotFoundError('Empresa não encontrada.')
      await transferManager({ companyId: company.id, toMemberId: request.body.memberId, changedByUserId: user.id, origin: 'admin', note: request.body.note })
      return reply.status(204).send(null)
    },
  )
}
