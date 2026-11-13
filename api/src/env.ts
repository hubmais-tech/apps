import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3333),
    DATABASE_URL: z.url(),
    FRONTEND_URL: z.string(),
    // Atrás de proxy ou balanceador (deploy), liga para o rate limit usar o IP real da pessoa e não o do proxy.
    TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
    JWT_SECRET: z.string().min(32),

    CLOUDFLARE_ENDPOINT: z.url(),
    CLOUDFLARE_ACCESS_KEY_ID: z.string().min(1),
    CLOUDFLARE_SECRET_ACCESS_KEY: z.string().min(1),
    CLOUDFLARE_BUCKET_NAME: z.string().min(1),
    CLOUDFLARE_PUBLIC_URL: z.string().min(1),

    PAYMENT_GATEWAY: z.enum(['stripe', 'fake']).default('fake'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(20),
    // Estimativa da taxa do meio de pagamento, descontada do mentor (D22). Padrão: cartão no Stripe Brasil.
    GATEWAY_FEE_PERCENT: z.coerce.number().min(0).max(100).default(3.99),
    GATEWAY_FEE_FIXED_IN_CENTS: z.coerce.number().int().min(0).default(39),
    WALLET_HOLD_DAYS: z.coerce.number().int().min(0).default(7),
    MIN_WITHDRAWAL_IN_CENTS: z.coerce.number().int().min(0).default(5000),

    SEED_ADMIN_EMAIL: z.string().optional(),
    SEED_ADMIN_PASSWORD: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.PAYMENT_GATEWAY === 'stripe') {
      if (!value.STRIPE_SECRET_KEY || !value.STRIPE_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: 'custom',
          message:
            'STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET são obrigatórios com PAYMENT_GATEWAY=stripe',
        })
      }
    }
    if (value.NODE_ENV === 'production' && value.PAYMENT_GATEWAY === 'fake') {
      ctx.addIssue({ code: 'custom', message: 'PAYMENT_GATEWAY=fake não é permitido em produção' })
    }
  })

export const env = envSchema.parse(process.env)

/**
 * Endereços do front-end. FRONTEND_URL aceita vários, separados por vírgula (ex.: site e www), sem barra no final.
 * Todos entram no CORS. O primeiro é o principal: base dos links de convite e dos retornos do Stripe.
 */
export function parseFrontendOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}
export const frontendOrigins = parseFrontendOrigins(env.FRONTEND_URL)
export const frontendUrl = frontendOrigins[0] ?? env.FRONTEND_URL
