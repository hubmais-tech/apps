import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { database, sql as pg } from '@/database/connection'
import { orders, users } from '@/database/schema'
import { env } from '@/env'
import { splitAmount } from '@/services/orders'
import { hashPassword } from '@/utils/password'

import { app, call, createPublishedCourse, enroll, openWallet, password, register, run, type Session } from './helpers'

// Cartão no Stripe Brasil (suposição de D22): 3,99% mais R$ 0,39. Retenção do Hub+: 20%.
const fees = { platformPercent: 20, gatewayPercent: 3.99, gatewayFixedInCents: 39 }

describe('divisão do valor da venda (D22)', () => {
  it('desconta a retenção do Hub+ e a taxa do gateway do valor pago', () => {
    // 20% de 19900 = 3980. Gateway: 3,99% de 19900 = 794,01 -> 794, mais 39 = 833.
    expect(splitAmount(19900, fees)).toEqual({ platformFeeInCents: 3980, gatewayFeeInCents: 833, mentorAmountInCents: 15087 })
  })

  it('a soma das três partes é sempre o valor pago, sem sobra de centavos', () => {
    for (const price of [500, 501, 999, 1234, 9900, 19999, 34990, 100000]) {
      const split = splitAmount(price, fees)
      expect(split.platformFeeInCents + split.gatewayFeeInCents + split.mentorAmountInCents).toBe(price)
      expect(split.mentorAmountInCents).toBeGreaterThan(0)
    }
  })

  it('o preço mínimo ainda deixa valor para o mentor', () => {
    expect(splitAmount(500, fees)).toEqual({ platformFeeInCents: 100, gatewayFeeInCents: 59, mentorAmountInCents: 341 })
  })

  it('sem taxa de gateway, volta ao 80/20 redondo', () => {
    expect(splitAmount(10000, { platformPercent: 20, gatewayPercent: 0, gatewayFixedInCents: 0 })).toEqual({ platformFeeInCents: 2000, gatewayFeeInCents: 0, mentorAmountInCents: 8000 })
  })

  it('recusa quando as taxas superam o valor, em vez de pagar o mentor com valor negativo', () => {
    expect(() => splitAmount(100, { platformPercent: 20, gatewayPercent: 3.99, gatewayFixedInCents: 200 })).toThrow()
  })
})

describe('prévia de ganhos e venda com taxa', () => {
  let mentor: Session
  let student: Session
  let admin: Session
  const original = { percent: env.GATEWAY_FEE_PERCENT, fixed: env.GATEWAY_FEE_FIXED_IN_CENTS, platform: env.PLATFORM_FEE_PERCENT }

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'pr-mentor')
    student = await register('student', 'pr-aluno')
    expect((await openWallet(mentor)).statusCode).toBe(201)

    const email = `admin-pr-${run}@teste.local`
    const [row] = await database.insert(users).values({ name: 'Admin preços', email, role: 'admin', passwordHash: await hashPassword(password) }).returning()
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } })
    admin = { token: login.json().token, id: row!.id }

    env.PLATFORM_FEE_PERCENT = 20
    env.GATEWAY_FEE_PERCENT = 3.99
    env.GATEWAY_FEE_FIXED_IN_CENTS = 39
  })

  afterEach(() => {
    env.PLATFORM_FEE_PERCENT = 20
    env.GATEWAY_FEE_PERCENT = 3.99
    env.GATEWAY_FEE_FIXED_IN_CENTS = 39
  })

  afterAll(async () => {
    env.PLATFORM_FEE_PERCENT = original.platform
    env.GATEWAY_FEE_PERCENT = original.percent
    env.GATEWAY_FEE_FIXED_IN_CENTS = original.fixed
    await app.close()
    await pg.end()
  })

  it('a prévia é pública e mostra quanto fica com o mentor', async () => {
    const response = await call(null, 'GET', '/pricing/preview?priceInCents=19900')
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      priceInCents: 19900,
      platformFeePercent: 20,
      platformFeeInCents: 3980,
      gatewayFeePercent: 3.99,
      gatewayFeeFixedInCents: 39,
      gatewayFeeInCents: 833,
      mentorAmountInCents: 15087,
      minPriceInCents: 500,
    })
  })

  it('recusa preço abaixo do mínimo e entrada inválida', async () => {
    expect((await call(null, 'GET', '/pricing/preview?priceInCents=100')).statusCode).toBe(400)
    expect((await call(null, 'GET', '/pricing/preview?priceInCents=abc')).statusCode).toBe(400)
    expect((await call(null, 'GET', '/pricing/preview')).statusCode).toBe(400)
  })

  it('a venda grava a taxa e o mentor recebe exatamente o valor da prévia', async () => {
    const preview = (await call(null, 'GET', '/pricing/preview?priceInCents=19900')).json()
    const course = await createPublishedCourse(mentor, 'Curso com taxa', 19900)
    await enroll(student, course.courseId)

    const [order] = await database.select().from(orders).where(eq(orders.courseId, course.courseId))
    expect(order).toMatchObject({
      amountInCents: 19900,
      platformFeeInCents: preview.platformFeeInCents,
      gatewayFeeInCents: preview.gatewayFeeInCents,
      mentorAmountInCents: preview.mentorAmountInCents,
    })

    const wallet = (await call(mentor, 'GET', '/wallet')).json()
    expect(wallet.pendingInCents).toBe(15087)

    const platform = (await call(admin, 'GET', '/wallet?scope=platform')).json()
    expect(platform.entries.some((e: { type: string; amountInCents: number }) => e.type === 'platform_fee' && e.amountInCents === 3980)).toBe(true)

    const listed = (await call(admin, 'GET', '/admin/orders')).json().orders.find((o: { id: string }) => o.id === order!.id)
    expect(listed).toMatchObject({ gatewayFeeInCents: 833, mentorAmountInCents: 15087, platformFeeInCents: 3980 })
  })

  it('mudar a taxa depois não altera pedidos antigos', async () => {
    env.GATEWAY_FEE_PERCENT = 10
    const course = await createPublishedCourse(mentor, 'Curso com taxa maior', 10000)
    const other = await register('student', 'pr-aluno2')
    await enroll(other, course.courseId)

    const [order] = await database.select().from(orders).where(eq(orders.courseId, course.courseId))
    // 10% de 10000 = 1000, mais 39 = 1039. Retenção 2000. Mentor: 6961.
    expect(order).toMatchObject({ gatewayFeeInCents: 1039, mentorAmountInCents: 6961 })

    env.GATEWAY_FEE_PERCENT = 3.99
    const [again] = await database.select().from(orders).where(eq(orders.id, order!.id))
    expect(again!.mentorAmountInCents).toBe(6961)
  })
})
