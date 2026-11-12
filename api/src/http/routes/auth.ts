import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { roleSchema, selfRegisterRoleSchema } from '@/auth/roles'
import { database } from '@/database/connection'
import { companies, companyMembers, users } from '@/database/schema'
import { hashInviteToken } from '@/services/company-access'
import { getOnboarding } from '@/services/onboarding'
import { hashPassword, verifyPassword } from '@/utils/password'

import { strictRateLimit } from '../rate-limit'
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../errors/http-errors'

const userResponse = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
})

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/register',
    {
      config: strictRateLimit,
      schema: {
        body: z.object({
          name: z.string().trim().min(2),
          email: z.email().transform((value) => value.toLowerCase()),
          password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.'),
          role: selfRegisterRoleSchema.default('student'),
        }),
        response: { 201: z.object({ token: z.string(), user: userResponse }) },
      },
    },
    async (request, reply) => {
      const { name, email, password, role } = request.body

      const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.email, email))
      if (existing) throw new ConflictError('Já existe uma conta com este e-mail.')

      const [user] = await database
        .insert(users)
        .values({ name, email, role, passwordHash: await hashPassword(password) })
        .returning()

      const token = await reply.jwtSign({ sub: user.id, role: user.role })
      return reply.status(201).send({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      })
    },
  )

  app.post(
    '/auth/login',
    {
      config: strictRateLimit,
      schema: {
        body: z.object({
          email: z.email().transform((value) => value.toLowerCase()),
          password: z.string().min(1),
        }),
        response: { 200: z.object({ token: z.string(), user: userResponse }) },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body
      const [user] = await database.select().from(users).where(eq(users.email, email))

      // Mensagem única para não revelar se o e-mail existe.
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new UnauthorizedError('E-mail ou senha inválidos.')
      }

      // Conta de empresa sem vínculo com uma empresa cadastrada pelo Hub+ não entra (D23).
      if (user.role === 'company') {
        const [member] = await database.select({ id: companyMembers.id }).from(companyMembers).where(eq(companyMembers.userId, user.id))
        if (!member) {
          throw new ForbiddenError('O cadastro de empresas agora é feito pelo Hub+. Fale com a equipe do Hub+ para cadastrar sua empresa.')
        }
      }

      const token = await reply.jwtSign({ sub: user.id, role: user.role })
      return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    },
  )

  app.get(
    '/me',
    {
      schema: {
        response: {
          200: z.object({
            user: userResponse,
            onboarding: z.object({ required: z.boolean(), completed: z.boolean(), path: z.string().nullable() }),
          }),
        },
      },
    },
    async (request) => {
      const authUser = await request.requireUser()
      const [user] = await database.select().from(users).where(eq(users.id, authUser.id))
      if (!user) throw new UnauthorizedError('Usuário não encontrado.')
      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        onboarding: await getOnboarding(authUser),
      }
    },
  )

  // ----- Convite de representante de empresa (D14) -----
  app.get(
    '/auth/invite/:token',
    {
      schema: {
        params: z.object({ token: z.string().min(20).max(100) }),
        response: { 200: z.object({ name: z.string(), email: z.string(), jobTitle: z.string(), companyName: z.string(), isManager: z.boolean() }) },
      },
    },
    async (request) => {
      const [row] = await database
        .select({ member: companyMembers, companyName: companies.tradeName })
        .from(companyMembers)
        .innerJoin(companies, eq(companies.id, companyMembers.companyId))
        .where(eq(companyMembers.inviteTokenHash, hashInviteToken(request.params.token)))
      if (!row || row.member.userId || !row.member.inviteExpiresAt || row.member.inviteExpiresAt < new Date()) {
        throw new NotFoundError('Convite inválido ou vencido. Peça um novo link ao Hub+ ou ao responsável pela conta da empresa.')
      }
      return { name: row.member.name, email: row.member.email, jobTitle: row.member.jobTitle, companyName: row.companyName, isManager: row.member.isPrimary }
    },
  )

  app.post(
    '/auth/accept-invite',
    {
      config: strictRateLimit,
      schema: {
        body: z.object({
          token: z.string().min(20).max(100),
          password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.'),
        }),
        response: { 201: z.object({ token: z.string(), user: userResponse }) },
      },
    },
    async (request, reply) => {
      const [member] = await database
        .select()
        .from(companyMembers)
        .where(eq(companyMembers.inviteTokenHash, hashInviteToken(request.body.token)))
      if (!member || member.userId || !member.inviteExpiresAt || member.inviteExpiresAt < new Date()) {
        throw new NotFoundError('Convite inválido ou vencido. Peça um novo link ao Hub+ ou ao responsável pela conta da empresa.')
      }

      const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.email, member.email))
      if (existing) throw new ConflictError('Já existe uma conta com este e-mail.')

      const user = await database.transaction(async (tx) => {
        const [created] = await tx
          .insert(users)
          .values({ name: member.name, email: member.email, role: 'company', passwordHash: await hashPassword(request.body.password) })
          .returning()
        await tx
          .update(companyMembers)
          .set({ userId: created!.id, joinedAt: new Date(), inviteTokenHash: null, inviteExpiresAt: null })
          .where(eq(companyMembers.id, member.id))
        return created!
      })

      const token = await reply.jwtSign({ sub: user.id, role: user.role })
      return reply.status(201).send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
    },
  )
}
