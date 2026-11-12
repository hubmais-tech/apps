import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { courses } from './courses'
import { users } from './users'

export const orderStatus = pgEnum('order_status', ['pending', 'paid', 'refunded', 'failed'])
export const ledgerEntryType = pgEnum('ledger_entry_type', [
  'sale',
  'platform_fee',
  'refund',
  'withdrawal',
  'withdrawal_reversal',
])
export const withdrawalStatus = pgEnum('withdrawal_status', ['requested', 'paid', 'rejected'])

export const orders = pgTable('orders', {
  id: uuid().primaryKey().defaultRandom(),
  buyerId: uuid()
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  courseId: uuid()
    .references(() => courses.id, { onDelete: 'restrict' })
    .notNull(),
  mentorId: uuid()
    .references(() => users.id, { onDelete: 'restrict' })
    .notNull(),
  amountInCents: integer().notNull(),
  platformFeeInCents: integer().notNull(),
  /** Estimativa da taxa do gateway, descontada do mentor (D22). A taxa real fica na conta do Stripe do Hub+. */
  gatewayFeeInCents: integer().default(0).notNull(),
  mentorAmountInCents: integer().notNull(),
  status: orderStatus().default('pending').notNull(),
  gatewayRef: text(),
  gatewayPaymentRef: text(),
  createdAt: timestamp().defaultNow().notNull(),
  paidAt: timestamp(),
  refundedAt: timestamp(),
})

/**
 * Ledger imutável. userId nulo = carteira do Hub+.
 * Valores com sinal: crédito positivo, débito negativo.
 * Saldo pendente = soma com availableAt no futuro; disponível = soma com availableAt <= agora.
 */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: 'restrict' }),
    type: ledgerEntryType().notNull(),
    amountInCents: integer().notNull(),
    availableAt: timestamp().notNull(),
    orderId: uuid().references(() => orders.id, { onDelete: 'restrict' }),
    withdrawalId: uuid(),
    description: text(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index('ledger_user_idx').on(t.userId)],
)

export const withdrawals = pgTable('withdrawals', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => users.id, { onDelete: 'restrict' }),
  amountInCents: integer().notNull(),
  pixKey: text().notNull(),
  pixKeyType: text().notNull(),
  status: withdrawalStatus().default('requested').notNull(),
  note: text(),
  requestedAt: timestamp().defaultNow().notNull(),
  processedAt: timestamp(),
  processedBy: uuid().references(() => users.id, { onDelete: 'restrict' }),
})
