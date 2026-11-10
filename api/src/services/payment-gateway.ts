import Stripe from 'stripe'

import { env } from '@/env'

export type CheckoutInput = {
  orderId: string
  title: string
  amountInCents: number
  buyerEmail: string
  successUrl: string
  cancelUrl: string
}

export type GatewayEvent =
  | { type: 'paid'; orderId: string; paymentRef: string | null }
  | { type: 'failed'; orderId: string }
  | { type: 'refunded'; paymentRef: string }
  | { type: 'ignored' }

/** Contrato que isola o gateway de pagamento. Trocar de provedor = nova implementação. */
export interface PaymentGateway {
  createCheckout(input: CheckoutInput): Promise<{ url: string; ref: string }>
  parseWebhook(rawBody: Buffer, signature: string | undefined): GatewayEvent
  refund(paymentRef: string): Promise<void>
}

class StripeGateway implements PaymentGateway {
  private stripe = new Stripe(env.STRIPE_SECRET_KEY!)

  async createCheckout(input: CheckoutInput) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: input.orderId,
      customer_email: input.buyerEmail,
      metadata: { orderId: input.orderId },
      payment_intent_data: { metadata: { orderId: input.orderId } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: input.amountInCents,
            product_data: { name: input.title },
          },
        },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    })

    if (!session.url) throw new Error('Stripe não retornou a URL do checkout.')
    return { url: session.url, ref: session.id }
  }

  parseWebhook(rawBody: Buffer, signature: string | undefined): GatewayEvent {
    if (!signature) throw new Error('Assinatura do webhook ausente.')
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET!)

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object
        if (session.payment_status !== 'paid' || !session.metadata?.orderId) {
          return { type: 'ignored' }
        }
        const paymentRef =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null)
        return { type: 'paid', orderId: session.metadata.orderId, paymentRef }
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const orderId = event.data.object.metadata?.orderId
        return orderId ? { type: 'failed', orderId } : { type: 'ignored' }
      }
      case 'charge.refunded': {
        const charge = event.data.object
        const paymentRef =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : (charge.payment_intent?.id ?? null)
        // Só trata reembolso total. Reembolso parcial exige decisão de negócio.
        if (!paymentRef || !charge.refunded) return { type: 'ignored' }
        return { type: 'refunded', paymentRef }
      }
      default:
        return { type: 'ignored' }
    }
  }

  async refund(paymentRef: string) {
    await this.stripe.refunds.create({ payment_intent: paymentRef })
  }
}

/** Somente desenvolvimento: o pagamento é confirmado por uma rota local, sem cobrança real. */
class FakeGateway implements PaymentGateway {
  async createCheckout(input: CheckoutInput) {
    return {
      url: `${env.FRONTEND_URL}/checkout/fake/${input.orderId}`,
      ref: `fake_${input.orderId}`,
    }
  }

  parseWebhook(): GatewayEvent {
    return { type: 'ignored' }
  }

  async refund() {}
}

export const paymentGateway: PaymentGateway =
  env.PAYMENT_GATEWAY === 'stripe' ? new StripeGateway() : new FakeGateway()
