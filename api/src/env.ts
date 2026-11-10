import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3333),
    DATABASE_URL: z.url(),
    FRONTEND_URL: z.string(),
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
