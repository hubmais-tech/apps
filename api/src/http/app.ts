import fastifyCors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import fastifyRateLimit from '@fastify/rate-limit'
import fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import { env } from '@/env'

import { errorHandler } from './error-handler'
import { authPlugin } from './plugins/auth'
import { adminCompanyRoutes } from './routes/admin-companies'
import { authRoutes } from './routes/auth'
import { challengeRoutes } from './routes/challenges'
import { dashboardRoutes } from './routes/dashboard'
import { checkoutRoutes, webhookRoutes } from './routes/checkout'
import { companyRoutes } from './routes/company'
import { courseRoutes } from './routes/courses'
import { learningRoutes } from './routes/learning'
import { portfolioRoutes } from './routes/portfolio'
import { pricingRoutes } from './routes/pricing'
import { profileRoutes } from './routes/profile'
import { talentRoutes } from './routes/talents'
import { walletRoutes } from './routes/wallet'

export function buildApp() {
  const app = fastify({ logger: env.NODE_ENV !== 'test' }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.setErrorHandler(errorHandler)

  app.register(fastifyRateLimit, { max: 200, timeWindow: '1 minute' })
  app.register(fastifyCors, {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    credentials: true,
  })
  app.register(fastifyJwt, { secret: env.JWT_SECRET, sign: { expiresIn: '7d' } })
  app.register(authPlugin)

  app.get('/health', async () => ({ status: 'ok' }))

  app.register(authRoutes)
  app.register(profileRoutes)
  app.register(companyRoutes)
  app.register(adminCompanyRoutes)
  app.register(pricingRoutes)
  app.register(courseRoutes)
  app.register(learningRoutes)
  app.register(challengeRoutes)
  app.register(portfolioRoutes)
  app.register(talentRoutes)
  app.register(dashboardRoutes)
  app.register(checkoutRoutes)
  app.register(walletRoutes)
  app.register(webhookRoutes)

  return app
}
