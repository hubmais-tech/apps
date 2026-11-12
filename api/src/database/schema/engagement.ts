import { boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { companies } from './profiles'
import { courses } from './courses'
import { users } from './users'

/** Desafio prático de um curso (D16). */
export const challenges = pgTable('challenges', {
  id: uuid().primaryKey().defaultRandom(),
  courseId: uuid()
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  brief: text().notNull(),
  criteria: text(),
  position: integer().default(0).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
})

export type Attachment = { key: string; name: string; size: number; contentType: string }

/** Entrega do aluno. Uma por aluno e desafio: reenviar atualiza a mesma linha e soma uma tentativa. */
export const submissions = pgTable(
  'submissions',
  {
    id: uuid().primaryKey().defaultRandom(),
    challengeId: uuid()
      .references(() => challenges.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid()
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text().notNull(),
    links: text().array().default([]).notNull(),
    attachments: jsonb().$type<Attachment[]>().default([]).notNull(),
    /** submitted: aguardando o mentor. changes_requested: o aluno precisa ajustar. approved: validada. */
    status: text().$type<'submitted' | 'changes_requested' | 'approved'>().default('submitted').notNull(),
    attempt: integer().default(1).notNull(),
    feedback: text(),
    reviewedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.challengeId, t.userId)],
)

/** Certificado de conclusão (D16). O código permite validar o documento numa página pública. */
export const certificates = pgTable(
  'certificates',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    courseId: uuid()
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    code: text().notNull().unique(),
    issuedAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.courseId)],
)

/** Projeto do portfólio do aluno (D17). `validatedAt` preenchido = aprovado por um mentor. */
export const portfolioItems = pgTable('portfolio_items', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text().notNull(),
  description: text(),
  links: text().array().default([]).notNull(),
  coverKey: text(),
  submissionId: uuid()
    .references(() => submissions.id, { onDelete: 'set null' })
    .unique(),
  validatedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp(),
  isPublic: boolean().default(true).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
})

/** Convite de uma empresa para um talento (D18). */
export const invitations = pgTable('invitations', {
  id: uuid().primaryKey().defaultRandom(),
  companyId: uuid()
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  invitedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  studentId: uuid()
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  roleTitle: text().notNull(),
  message: text().notNull(),
  status: text().$type<'sent' | 'accepted' | 'declined' | 'hired' | 'withdrawn'>().default('sent').notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  respondedAt: timestamp(),
})
