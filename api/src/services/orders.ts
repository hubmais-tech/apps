import { and, eq } from 'drizzle-orm'

import type { Transaction } from '@/database/connection'
import { enrollments, ledgerEntries, orders } from '@/database/schema'
import { env } from '@/env'

export type FeeConfig = { platformPercent: number; gatewayPercent: number; gatewayFixedInCents: number }

const currentFees = (): FeeConfig => ({
  platformPercent: env.PLATFORM_FEE_PERCENT,
  gatewayPercent: env.GATEWAY_FEE_PERCENT,
  gatewayFixedInCents: env.GATEWAY_FEE_FIXED_IN_CENTS,
})

/**
 * Divide o valor pago entre Hub+, gateway e mentor (D22). Tudo em centavos inteiros.
 * A retenção do Hub+ é um percentual do valor pago. A taxa do gateway é estimada (percentual mais valor fixo)
 * e descontada do mentor. O mentor recebe o que sobra, então a soma das três partes é sempre o valor pago.
 */
export function splitAmount(amountInCents: number, fees: FeeConfig = currentFees()) {
  const platformFeeInCents = Math.round((amountInCents * fees.platformPercent) / 100)
  const gatewayFeeInCents = Math.round((amountInCents * fees.gatewayPercent) / 100) + fees.gatewayFixedInCents
  const mentorAmountInCents = amountInCents - platformFeeInCents - gatewayFeeInCents
  if (mentorAmountInCents < 0) {
    // O preço mínimo do curso impede isso; se acontecer, falhar é melhor que pagar o mentor com valor negativo.
    throw new Error('As taxas superam o valor do curso.')
  }
  return { platformFeeInCents, gatewayFeeInCents, mentorAmountInCents }
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

/** Idempotente: webhooks do gateway podem chegar mais de uma vez. */
export async function markOrderPaid(tx: Transaction, orderId: string, paymentRef: string | null) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
  if (!order || order.status === 'paid' || order.status === 'refunded') return null

  const paidAt = new Date()
  const availableAt = addDays(paidAt, env.WALLET_HOLD_DAYS)

  await tx
    .update(orders)
    .set({ status: 'paid', paidAt, gatewayPaymentRef: paymentRef ?? order.gatewayPaymentRef })
    .where(eq(orders.id, orderId))

  await tx
    .insert(enrollments)
    .values({ userId: order.buyerId, courseId: order.courseId })
    .onConflictDoNothing()

  await tx.insert(ledgerEntries).values([
    {
      userId: order.mentorId,
      type: 'sale',
      amountInCents: order.mentorAmountInCents,
      availableAt,
      orderId,
      description: 'Venda de curso',
    },
    {
      userId: null,
      type: 'platform_fee',
      amountInCents: order.platformFeeInCents,
      availableAt,
      orderId,
      description: 'Retenção do Hub+',
    },
  ])

  return order
}

export async function markOrderFailed(tx: Transaction, orderId: string) {
  await tx
    .update(orders)
    .set({ status: 'failed' })
    .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')))
}

/**
 * Estorna os lançamentos do pedido e revoga o acesso ao curso.
 * Dentro da janela de garantia o estorno zera o saldo pendente. Depois dela, debita o disponível.
 */
export async function markOrderRefunded(tx: Transaction, orderId: string) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update')
  if (!order || order.status !== 'paid') return null

  const now = new Date()

  await tx.update(orders).set({ status: 'refunded', refundedAt: now }).where(eq(orders.id, orderId))

  await tx
    .delete(enrollments)
    .where(and(eq(enrollments.userId, order.buyerId), eq(enrollments.courseId, order.courseId)))

  const original = await tx
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.orderId, orderId)))

  const toReverse = original.filter((entry) => entry.type === 'sale' || entry.type === 'platform_fee')

  if (toReverse.length > 0) {
    await tx.insert(ledgerEntries).values(
      toReverse.map((entry) => ({
        userId: entry.userId,
        type: 'refund' as const,
        amountInCents: -entry.amountInCents,
        availableAt: entry.availableAt > now ? entry.availableAt : now,
        orderId,
        description: 'Reembolso do pedido',
      })),
    )
  }

  return order
}
