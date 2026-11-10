import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

import { env } from '@/env'

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from './errors/http-errors'

type ErrorHandler = FastifyInstance['errorHandler']

export const errorHandler: ErrorHandler = (rawError, request, reply) => {
  const error = rawError as Error
  if (hasZodFastifySchemaValidationErrors(rawError)) {
    return reply.status(400).send({
      message: 'Dados inválidos.',
      issues: rawError.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message,
      })),
    })
  }

  if (error instanceof BadRequestError) return reply.status(400).send({ message: error.message })
  if (error instanceof UnauthorizedError) return reply.status(401).send({ message: error.message })
  if (error instanceof ForbiddenError) return reply.status(403).send({ message: error.message })
  if (error instanceof NotFoundError) return reply.status(404).send({ message: error.message })
  if (error instanceof ConflictError) return reply.status(409).send({ message: error.message })

  const statusCode = (error as { statusCode?: number }).statusCode
  if (statusCode === 429) {
    return reply.status(429).send({ message: 'Muitas requisições. Tente novamente em instantes.' })
  }

  request.log.error(error)
  return reply.status(500).send({
    message: env.NODE_ENV === 'production' ? 'Erro interno do servidor.' : error.message,
  })
}
