import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { env } from '@/env'
import { splitAmount } from '@/services/orders'
import { MIN_PRICE_IN_CENTS } from '@/services/pricing'

import { BadRequestError } from '../errors/http-errors'

export const pricingRoutes: FastifyPluginAsyncZod = async (app) => {
  // Mostra ao mentor quanto fica com ele (D22). Usa a mesma função que grava o pedido,
  // então o valor exibido é o que cai na carteira.
  app.get(
    '/pricing/preview',
    {
      schema: {
        querystring: z.object({ priceInCents: z.coerce.number().int().min(0).max(10_000_000) }),
        response: {
          200: z.object({
            priceInCents: z.number(),
            minPriceInCents: z.number(),
            platformFeePercent: z.number(),
            platformFeeInCents: z.number(),
            gatewayFeePercent: z.number(),
            gatewayFeeFixedInCents: z.number(),
            gatewayFeeInCents: z.number(),
            mentorAmountInCents: z.number(),
            holdDays: z.number(),
          }),
        },
      },
    },
    async (request) => {
      const { priceInCents } = request.query
      if (priceInCents < MIN_PRICE_IN_CENTS) throw new BadRequestError('O preço mínimo é R$ 5,00.')

      return {
        priceInCents,
        minPriceInCents: MIN_PRICE_IN_CENTS,
        platformFeePercent: env.PLATFORM_FEE_PERCENT,
        gatewayFeePercent: env.GATEWAY_FEE_PERCENT,
        gatewayFeeFixedInCents: env.GATEWAY_FEE_FIXED_IN_CENTS,
        holdDays: env.WALLET_HOLD_DAYS,
        ...splitAmount(priceInCents),
      }
    },
  )
}
