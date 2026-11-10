import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { roleSchema, selfRegisterRoleSchema } from '@/auth/roles'
import { database } from '@/database/connection'
import { users } from '@/database/schema'
import { hashPassword, verifyPassword } from '@/utils/password'

import { ConflictError, UnauthorizedError } from '../errors/http-errors'

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
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
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
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
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

      const token = await reply.jwtSign({ sub: user.id, role: user.role })
      return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    },
  )

  app.get(
    '/me',
    { schema: { response: { 200: z.object({ user: userResponse }) } } },
    async (request) => {
      const { id } = await request.requireUser()
      const [user] = await database.select().from(users).where(eq(users.id, id))
      if (!user) throw new UnauthorizedError('Usuário não encontrado.')
      return { user: { id: user.id, name: user.name, email: user.email, role: user.role } }
    },
  )
}
