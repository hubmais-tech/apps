import { and, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm'

import { ledgerEntries, withdrawals } from '@/database/schema'
import type { DbOrTx, Transaction } from '@/database/connection'
import { BadRequestError } from '@/http/errors/http-errors'

/** userId nulo = carteira do Hub+. */
export type WalletOwner = string | null

const ownerFilter = (owner: WalletOwner) =>
  owner === null ? isNull(ledgerEntries.userId) : eq(ledgerEntries.userId, owner)

export async function getBalances(db: DbOrTx, owner: WalletOwner) {
  const now = new Date()

  const [available] = await db
    .select({ total: sql<number>`coalesce(sum(${ledgerEntries.amountInCents}), 0)::int` })
    .from(ledgerEntries)
    .where(and(ownerFilter(owner), lte(ledgerEntries.availableAt, now)))

  const [pending] = await db
    .select({ total: sql<number>`coalesce(sum(${ledgerEntries.amountInCents}), 0)::int` })
    .from(ledgerEntries)
    .where(and(ownerFilter(owner), gt(ledgerEntries.availableAt, now)))

  return { availableInCents: available.total, pendingInCents: pending.total }
}

export async function listEntries(db: DbOrTx, owner: WalletOwner, limit = 50) {
  return db
    .select()
    .from(ledgerEntries)
    .where(ownerFilter(owner))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit)
}

/** Serializa operações de saldo da mesma carteira dentro da transação. */
async function lockWallet(tx: Transaction, owner: WalletOwner) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${owner ?? 'platform'}))`)
}

export async function requestWithdrawal(
  tx: Transaction,
  input: {
    owner: WalletOwner
    amountInCents: number
    pixKey: string
    pixKeyType: string
    minimumInCents: number
  },
) {
  await lockWallet(tx, input.owner)

  if (input.amountInCents < input.minimumInCents) {
    throw new BadRequestError('Valor abaixo do saque mínimo.')
  }

  const { availableInCents } = await getBalances(tx, input.owner)
  if (input.amountInCents > availableInCents) {
    throw new BadRequestError('Saldo disponível insuficiente.')
  }

  const [withdrawal] = await tx
    .insert(withdrawals)
    .values({
      userId: input.owner,
      amountInCents: input.amountInCents,
      pixKey: input.pixKey,
      pixKeyType: input.pixKeyType,
    })
    .returning()

  await tx.insert(ledgerEntries).values({
    userId: input.owner,
    type: 'withdrawal',
    amountInCents: -input.amountInCents,
    availableAt: new Date(),
    withdrawalId: withdrawal.id,
    description: 'Solicitação de saque',
  })

  return withdrawal
}

export async function rejectWithdrawal(
  tx: Transaction,
  withdrawalId: string,
  adminId: string,
  note?: string,
) {
  const [withdrawal] = await tx
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .for('update')

  if (!withdrawal) throw new BadRequestError('Saque não encontrado.')
  if (withdrawal.status !== 'requested') throw new BadRequestError('Saque já processado.')

  await tx
    .update(withdrawals)
    .set({ status: 'rejected', processedAt: new Date(), processedBy: adminId, note })
    .where(eq(withdrawals.id, withdrawalId))

  await tx.insert(ledgerEntries).values({
    userId: withdrawal.userId,
    type: 'withdrawal_reversal',
    amountInCents: withdrawal.amountInCents,
    availableAt: new Date(),
    withdrawalId,
    description: 'Saque recusado, valor devolvido ao saldo',
  })
}

export async function markWithdrawalPaid(
  tx: Transaction,
  withdrawalId: string,
  adminId: string,
  note?: string,
) {
  const [withdrawal] = await tx
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.id, withdrawalId))
    .for('update')

  if (!withdrawal) throw new BadRequestError('Saque não encontrado.')
  if (withdrawal.status !== 'requested') throw new BadRequestError('Saque já processado.')

  await tx
    .update(withdrawals)
    .set({ status: 'paid', processedAt: new Date(), processedBy: adminId, note })
    .where(eq(withdrawals.id, withdrawalId))
}
