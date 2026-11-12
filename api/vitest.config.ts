import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// As variáveis vêm do .env via `node --env-file` (ver script "test" no package.json).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    // Os testes de divisão da venda usam números redondos (80/20), então a taxa do gateway começa zerada.
    // Os testes de taxa ajustam o valor por conta própria.
    // Os testes nunca falam com o Stripe de verdade, mesmo que o .env aponte para ele.
    env: { NODE_ENV: 'test', PAYMENT_GATEWAY: 'fake', PLATFORM_FEE_PERCENT: '20', WALLET_HOLD_DAYS: '7', MIN_WITHDRAWAL_IN_CENTS: '5000', GATEWAY_FEE_PERCENT: '0', GATEWAY_FEE_FIXED_IN_CENTS: '0' },
    fileParallelism: false,
    testTimeout: 20000,
  },
})
