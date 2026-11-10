import { env } from '@/env'

import { buildApp } from './app'

const app = buildApp()

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then(() => console.log(`API do Hub+ rodando na porta ${env.PORT}`))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
