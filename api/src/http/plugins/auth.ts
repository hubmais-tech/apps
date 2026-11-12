import { eq } from 'drizzle-orm'
import fastifyPlugin from 'fastify-plugin'

import { defineAbilityFor, type AuthUser } from '@/auth'
import { roleSchema } from '@/auth/roles'
import { database } from '@/database/connection'
import { companyMembers, mentorAccounts } from '@/database/schema'

import { UnauthorizedError } from '../errors/http-errors'

declare module 'fastify' {
  interface FastifyRequest {
    /** Exige token válido. Lança 401 se ausente ou inválido. */
    requireUser(): Promise<AuthUser>
    /** Retorna o usuário se houver token válido, senão null. */
    optionalUser(): Promise<AuthUser | null>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string }
    user: { sub: string; role: string }
  }
}

/** Monta o usuário autenticado e carrega o que as permissões dependem (carteira do mentor, empresa). */
async function buildAuthUser(payload: { sub: string; role: string }): Promise<AuthUser> {
  const role = roleSchema.parse(payload.role)
  const user: AuthUser = { id: payload.sub, role }

  if (role === 'mentor') {
    const [account] = await database.select({ id: mentorAccounts.userId }).from(mentorAccounts).where(eq(mentorAccounts.userId, user.id))
    user.walletOpened = Boolean(account)
  }
  if (role === 'company') {
    const [member] = await database.select({ companyId: companyMembers.companyId }).from(companyMembers).where(eq(companyMembers.userId, user.id))
    user.companyId = member?.companyId ?? null
  }
  return user
}

export const authPlugin = fastifyPlugin(async (app) => {
  app.decorateRequest('requireUser', async function () {
    try {
      return await buildAuthUser(await this.jwtVerify<{ sub: string; role: string }>())
    } catch {
      throw new UnauthorizedError('Token inválido ou ausente.')
    }
  })

  app.decorateRequest('optionalUser', async function () {
    if (!this.headers.authorization) return null
    try {
      return await buildAuthUser(await this.jwtVerify<{ sub: string; role: string }>())
    } catch {
      return null
    }
  })
})

export { defineAbilityFor }
