import { createHash, randomBytes } from 'node:crypto'

import { and, eq } from 'drizzle-orm'

import { database } from '@/database/connection'
import { companyManagerChanges, companyMembers } from '@/database/schema'
import { frontendUrl } from '@/env'

import { BadRequestError, NotFoundError } from '../http/errors/http-errors'

export const INVITE_DAYS = 7

export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Link de convite de uso único. Só o hash é guardado (D14). */
export function newInvite() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    inviteTokenHash: hashInviteToken(token),
    inviteExpiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    url: `${frontendUrl}/convite/${token}`,
  }
}

/** active: já tem acesso. pending: convite enviado. expired: convite venceu. */
export function memberStatus(member: Pick<typeof companyMembers.$inferSelect, 'userId' | 'inviteExpiresAt'>) {
  if (member.userId) return 'active' as const
  return member.inviteExpiresAt && member.inviteExpiresAt < new Date() ? ('expired' as const) : ('pending' as const)
}

/**
 * Passa a gestão da conta para outro representante (D23).
 * Só quem já tem acesso (usuário criado) pode assumir. Há sempre exatamente um responsável.
 */
export async function transferManager(input: {
  companyId: string
  toMemberId: string
  changedByUserId: string
  origin: 'company' | 'admin'
  note?: string | null
}) {
  await database.transaction(async (tx) => {
    const members = await tx.select().from(companyMembers).where(eq(companyMembers.companyId, input.companyId)).for('update')
    const target = members.find((m) => m.id === input.toMemberId)
    if (!target) throw new NotFoundError('Representante não encontrado.')
    if (target.isPrimary) throw new BadRequestError('Esta pessoa já é a responsável pela conta.')
    if (!target.userId) throw new BadRequestError('A pessoa precisa ativar o acesso antes de assumir a conta.')
    const current = members.find((m) => m.isPrimary)

    // Primeiro tira o responsável atual, para nunca haver dois ao mesmo tempo.
    if (current) await tx.update(companyMembers).set({ isPrimary: false }).where(eq(companyMembers.id, current.id))
    await tx.update(companyMembers).set({ isPrimary: true }).where(and(eq(companyMembers.id, target.id), eq(companyMembers.companyId, input.companyId)))
    await tx.insert(companyManagerChanges).values({
      companyId: input.companyId,
      fromMemberId: current?.id ?? null,
      toMemberId: target.id,
      changedByUserId: input.changedByUserId,
      origin: input.origin,
      note: input.note ?? null,
    })
  })
}
