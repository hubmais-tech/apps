import { and, desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { defineAbilityFor } from '@/auth'
import { database } from '@/database/connection'
import { courses, enrollments, orders, users } from '@/database/schema'
import { env } from '@/env'
import { paymentGateway } from '@/services/payment-gateway'
import { markOrderFailed, markOrderPaid, markOrderRefunded, splitAmount } from '@/services/orders'

import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../errors/http-errors'

export const checkoutRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/courses/:id/checkout',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        params: z.object({ id: z.uuid() }),
        response: { 200: z.object({ url: z.string(), orderId: z.uuid() }) },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('create', 'Order')) {
        throw new ForbiddenError('Seu perfil não pode comprar cursos.')
      }

      const [course] = await database.select().from(courses).where(eq(courses.id, request.params.id))
      if (!course || !course.isPublished) throw new NotFoundError('Curso não encontrado.')
      if (course.mentorId === user.id) throw new BadRequestError('Você não pode comprar o seu próprio curso.')

      const [enrolled] = await database
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, course.id)))
      if (enrolled) throw new BadRequestError('Você já tem acesso a este curso.')

      const [buyer] = await database.select().from(users).where(eq(users.id, user.id))
      const split = splitAmount(course.priceInCents)

      const [order] = await database
        .insert(orders)
        .values({
          buyerId: user.id,
          courseId: course.id,
          mentorId: course.mentorId,
          amountInCents: course.priceInCents,
          ...split,
        })
        .returning()

      const checkout = await paymentGateway.createCheckout({
        orderId: order.id,
        title: course.title,
        amountInCents: order.amountInCents,
        buyerEmail: buyer.email,
        successUrl: `${env.FRONTEND_URL}/courses/${course.slug}/learn?paid=1`,
        cancelUrl: `${env.FRONTEND_URL}/courses/${course.slug}`,
      })

      await database.update(orders).set({ gatewayRef: checkout.ref }).where(eq(orders.id, order.id))

      return { url: checkout.url, orderId: order.id }
    },
  )

  // Somente com PAYMENT_GATEWAY=fake: simula a confirmação do pagamento.
  if (env.PAYMENT_GATEWAY === 'fake') {
    app.post(
      '/dev/orders/:id/pay',
      { schema: { params: z.object({ id: z.uuid() }), response: { 204: z.null() } } },
      async (request, reply) => {
        const user = await request.requireUser()
        const [order] = await database.select().from(orders).where(eq(orders.id, request.params.id))
        if (!order || order.buyerId !== user.id) throw new NotFoundError('Pedido não encontrado.')

        await database.transaction((tx) => markOrderPaid(tx, order.id, `fake_pi_${order.id}`))
        return reply.status(204).send(null)
      },
    )
  }

  app.get(
    '/admin/orders',
    {
      schema: {
        response: {
          200: z.object({
            orders: z.array(
              z.object({
                id: z.uuid(),
                courseTitle: z.string(),
                buyerEmail: z.string(),
                amountInCents: z.number(),
                platformFeeInCents: z.number(),
                gatewayFeeInCents: z.number(),
                mentorAmountInCents: z.number(),
                status: z.enum(['pending', 'paid', 'refunded', 'failed']),
                createdAt: z.date(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('manage', 'Order')) throw new ForbiddenError('Acesso restrito.')

      const rows = await database
        .select({ order: orders, courseTitle: courses.title, buyerEmail: users.email })
        .from(orders)
        .innerJoin(courses, eq(courses.id, orders.courseId))
        .innerJoin(users, eq(users.id, orders.buyerId))
        .orderBy(desc(orders.createdAt))
        .limit(100)

      return {
        orders: rows.map(({ order, courseTitle, buyerEmail }) => ({
          id: order.id,
          courseTitle,
          buyerEmail,
          amountInCents: order.amountInCents,
          platformFeeInCents: order.platformFeeInCents,
          gatewayFeeInCents: order.gatewayFeeInCents,
          mentorAmountInCents: order.mentorAmountInCents,
          status: order.status,
          createdAt: order.createdAt,
        })),
      }
    },
  )

  app.post(
    '/admin/orders/:id/refund',
    { schema: { params: z.object({ id: z.uuid() }), response: { 204: z.null() } } },
    async (request, reply) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('manage', 'Order')) throw new ForbiddenError('Acesso restrito.')

      const [order] = await database.select().from(orders).where(eq(orders.id, request.params.id))
      if (!order) throw new NotFoundError('Pedido não encontrado.')
      if (order.status !== 'paid') throw new BadRequestError('Só é possível reembolsar pedidos pagos.')
      if (!order.gatewayPaymentRef) throw new BadRequestError('Pedido sem referência de pagamento.')

      await paymentGateway.refund(order.gatewayPaymentRef)
      await database.transaction((tx) => markOrderRefunded(tx, order.id))
      return reply.status(204).send(null)
    },
  )
}

/** Isolado em um plugin próprio: o webhook precisa do corpo bruto para validar a assinatura. */
export const webhookRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body)
  })

  app.post(
    '/webhooks/stripe',
    { config: { rateLimit: false } },
    async (request, reply) => {
      let event
      try {
        event = paymentGateway.parseWebhook(
          request.body as Buffer,
          request.headers['stripe-signature'] as string | undefined,
        )
      } catch (error) {
        request.log.warn({ err: error }, 'Webhook rejeitado')
        return reply.status(400).send({ message: 'Assinatura inválida.' })
      }

      await database.transaction(async (tx) => {
        if (event.type === 'paid') await markOrderPaid(tx, event.orderId, event.paymentRef)
        if (event.type === 'failed') await markOrderFailed(tx, event.orderId)
        if (event.type === 'refunded') {
          const [order] = await tx
            .select({ id: orders.id })
            .from(orders)
            .where(eq(orders.gatewayPaymentRef, event.paymentRef))
          if (order) await markOrderRefunded(tx, order.id)
        }
      })

      return reply.status(200).send({ received: true })
    },
  )
}
