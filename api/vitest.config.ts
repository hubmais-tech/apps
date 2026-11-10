import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

// As variáveis vêm do .env via `node --env-file` (ver script "test" no package.json).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'],
    env: { NODE_ENV: 'test' },
    fileParallelism: false,
    testTimeout: 20000,
  },
})
