import { desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { asSubject, defineAbilityFor, type AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { users, withdrawals } from '@/database/schema'
import { env } from '@/env'
import {
  getBalances,
  listEntries,
  markWithdrawalPaid,
  rejectWithdrawal,
  requestWithdrawal,
  type WalletOwner,
} from '@/services/wallet'

import { ForbiddenError } from '../errors/http-errors'

const scopeSchema = z.enum(['me', 'platform']).default('me')

/** "me" = carteira do usuário logado. "platform" = carteira do Hub+, só para admin. */
function resolveOwner(user: AuthUser, scope: 'me' | 'platform', action: 'get' | 'create'): WalletOwner {
  const ability = defineAbilityFor(user)

  if (scope === 'platform') {
    if (!ability.can('get', 'PlatformWallet')) throw new ForbiddenError('Acesso restrito ao admin.')
    return null
  }

  const allowed =
    action === 'get'
      ? ability.can('get', asSubject('Wallet', { userId: user.id }))
      : ability.can('create', asSubject('Withdrawal', { userId: user.id }))
  if (!allowed) throw new ForbiddenError('Seu perfil não possui carteira.')
  return user.id
}

const withdrawalSchema = z.object({
  id: z.uuid(),
  amountInCents: z.number(),
  pixKey: z.string(),
  pixKeyType: z.string(),
  status: z.enum(['requested', 'paid', 'rejected']),
  note: z.string().nullable(),
  requestedAt: z.date(),
  processedAt: z.date().nullable(),
})

export const walletRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/wallet',
    {
      schema: {
        querystring: z.object({ scope: scopeSchema }),
        response: {
          200: z.object({
            holdDays: z.number(),
            minimumWithdrawalInCents: z.number(),
            availableInCents: z.number(),
            pendingInCents: z.number(),
            entries: z.array(
              z.object({
                id: z.uuid(),
                type: z.enum(['sale', 'platform_fee', 'refund', 'withdrawal', 'withdrawal_reversal']),
                amountInCents: z.number(),
                availableAt: z.date(),
                description: z.string().nullable(),
                createdAt: z.date(),
              }),
            ),
            withdrawals: z.array(withdrawalSchema),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      const owner = resolveOwner(user, request.query.scope, 'get')

      const [balances, entries, requested] = await Promise.all([
        getBalances(database, owner),
        listEntries(database, owner),
        database
          .select()
          .from(withdrawals)
          .where(owner === null ? undefined : eq(withdrawals.userId, owner))
          .orderBy(desc(withdrawals.requestedAt))
          .limit(50),
      ])

      return {
        holdDays: env.WALLET_HOLD_DAYS,
        minimumWithdrawalInCents: env.MIN_WITHDRAWAL_IN_CENTS,
        ...balances,
        entries,
        // Na carteira do Hub+ só aparecem os saques da própria plataforma.
        withdrawals: owner === null ? requested.filter((w) => w.userId === null) : requested,
      }
    },
  )

  app.post(
    '/wallet/withdrawals',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: z.object({
          scope: scopeSchema,
          amountInCents: z.number().int().positive(),
          pixKey: z.string().trim().min(3),
          pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random']),
        }),
        response: { 201: z.object({ withdrawalId: z.uuid() }) },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      const { scope, amountInCents, pixKey, pixKeyType } = request.body
      const owner = resolveOwner(user, scope, 'create')

      const withdrawal = await database.transaction((tx) =>
        requestWithdrawal(tx, {
          owner,
          amountInCents,
          pixKey,
          pixKeyType,
          minimumInCents: env.MIN_WITHDRAWAL_IN_CENTS,
        }),
      )

      return reply.status(201).send({ withdrawalId: withdrawal.id })
    },
  )

  app.get(
    '/admin/withdrawals',
    {
      schema: {
        querystring: z.object({ status: z.enum(['requested', 'paid', 'rejected']).optional() }),
        response: {
          200: z.object({
            withdrawals: z.array(withdrawalSchema.extend({ ownerName: z.string() })),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('manage', 'Withdrawal')) throw new ForbiddenError('Acesso restrito.')

      const rows = await database
        .select({ withdrawal: withdrawals, ownerName: users.name })
        .from(withdrawals)
        .leftJoin(users, eq(users.id, withdrawals.userId))
        .where(request.query.status ? eq(withdrawals.status, request.query.status) : undefined)
        .orderBy(desc(withdrawals.requestedAt))
        .limit(100)

      return {
        withdrawals: rows.map(({ withdrawal, ownerName }) => ({
          ...withdrawal,
          ownerName: ownerName ?? 'Hub+ (plataforma)',
        })),
      }
    },
  )

  for (const action of ['pay', 'reject'] as const) {
    app.post(
      `/admin/withdrawals/:id/${action}`,
      {
        schema: {
          params: z.object({ id: z.uuid() }),
          body: z.object({ note: z.string().trim().optional() }).default({}),
          response: { 204: z.null() },
        },
      },
      async (request, reply) => {
        const user = await request.requireUser()
        if (!defineAbilityFor(user).can('manage', 'Withdrawal')) throw new ForbiddenError('Acesso restrito.')

        await database.transaction((tx) =>
          action === 'pay'
            ? markWithdrawalPaid(tx, request.params.id, user.id, request.body.note)
            : rejectWithdrawal(tx, request.params.id, user.id, request.body.note),
        )
        return reply.status(204).send(null)
      },
    )
  }
}
