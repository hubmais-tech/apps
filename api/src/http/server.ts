import { sql } from '@/database/connection'
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

// Em container, o orquestrador manda SIGTERM ao trocar de versão. Termina as requisições em andamento e fecha o banco.
let closing = false
async function shutdown(signal: string) {
  if (closing) return
  closing = true
  console.log(`${signal} recebido, encerrando...`)
  const timeout = setTimeout(() => process.exit(1), 10_000)
  timeout.unref()
  try {
    await app.close()
    await sql.end({ timeout: 5 })
    process.exit(0)
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
