import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sql as pg } from '@/database/connection'
import { frontendOrigins, frontendUrl, parseFrontendOrigins } from '@/env'

import { app } from './helpers'

describe('endereços do front-end (deploy com site e API em domínios diferentes)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  it('aceita vários endereços, tira espaços e a barra do final', () => {
    expect(parseFrontendOrigins('https://hubmais.com.br/')).toEqual(['https://hubmais.com.br'])
    expect(parseFrontendOrigins(' https://hubmais.com.br , https://www.hubmais.com.br// ')).toEqual(['https://hubmais.com.br', 'https://www.hubmais.com.br'])
    expect(parseFrontendOrigins('https://a.com,,')).toEqual(['https://a.com'])
  })

  it('o endereço principal é o primeiro, sem barra (base dos convites e do retorno do Stripe)', () => {
    expect(frontendUrl).toBe(frontendOrigins[0])
    expect(frontendUrl.endsWith('/')).toBe(false)
  })

  it('o CORS libera o site e recusa outra origem', async () => {
    const preflight = (origin: string) =>
      app.inject({ method: 'OPTIONS', url: '/auth/login', headers: { origin, 'access-control-request-method': 'POST' } })

    const allowed = await preflight(frontendUrl)
    expect(allowed.statusCode).toBe(204)
    expect(allowed.headers['access-control-allow-origin']).toBe(frontendUrl)

    const denied = await preflight('https://site-de-terceiros.example')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })
})
