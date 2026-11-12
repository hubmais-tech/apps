import { env } from '@/env'

/** Limite para rotas sensíveis (cadastro, documentos). Nos testes o limite é folgado. */
export const strictRateLimit = {
  rateLimit: { max: env.NODE_ENV === 'test' ? 1000 : 10, timeWindow: '1 minute' },
}
