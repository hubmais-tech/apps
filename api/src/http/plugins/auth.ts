import fastifyPlugin from 'fastify-plugin'

import { defineAbilityFor, type AuthUser } from '@/auth'
import { roleSchema } from '@/auth/roles'

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

export const authPlugin = fastifyPlugin(async (app) => {
  app.decorateRequest('requireUser', async function () {
    try {
      const payload = await this.jwtVerify<{ sub: string; role: string }>()
      return { id: payload.sub, role: roleSchema.parse(payload.role) }
    } catch {
      throw new UnauthorizedError('Token inválido ou ausente.')
    }
  })

  app.decorateRequest('optionalUser', async function () {
    if (!this.headers.authorization) return null
    try {
      const payload = await this.jwtVerify<{ sub: string; role: string }>()
      return { id: payload.sub, role: roleSchema.parse(payload.role) }
    } catch {
      return null
    }
  })
})

export { defineAbilityFor }
