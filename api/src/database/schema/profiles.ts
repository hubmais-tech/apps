import { boolean, date, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'

import { users } from './users'

/** Perfil opcional do aluno. Sem CPF (docs/DECISIONS.md, D12). */
export const studentProfiles = pgTable('student_profiles', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  birthDate: date(),
  city: text(),
  neighborhood: text(),
  phone: text(),
  interests: text().array().default([]).notNull(),
  goal: text(),
  headline: text(),
  bio: text(),
  /** Aparece no Banco de Talentos. Exige ao menos 1 projeto validado (D18). */
  talentVisible: boolean().default(false).notNull(),
  onboardingCompletedAt: timestamp(),
  onboardingSkippedAt: timestamp(),
  updatedAt: timestamp().defaultNow().notNull(),
})

/** A "carteira aberta" do mentor: dados pessoais e de recebimento (D13). */
export const mentorAccounts = pgTable('mentor_accounts', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'restrict' }),
  fullName: text().notNull(),
  cpf: text().notNull().unique(),
  birthDate: date().notNull(),
  phone: text().notNull(),
  pixKeyType: text().notNull(),
  pixKey: text().notNull(),
  bio: text().notNull(),
  expertise: text().array().default([]).notNull(),
  termsAcceptedAt: timestamp().notNull(),
  openedAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})

export const companies = pgTable('companies', {
  id: uuid().primaryKey().defaultRandom(),
  cnpj: text().notNull().unique(),
  legalName: text().notNull(),
  tradeName: text().notNull(),
  sector: text().notNull(),
  size: text().notNull(),
  city: text().notNull(),
  state: text().notNull(),
  website: text(),
  about: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
})

/** Representantes da empresa. `userId` fica nulo até a pessoa aceitar o convite (D14). */
export const companyMembers = pgTable(
  'company_members',
  {
    id: uuid().primaryKey().defaultRandom(),
    companyId: uuid()
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    name: text().notNull(),
    jobTitle: text().notNull(),
    email: text().notNull(),
    phone: text(),
    isPrimary: boolean().default(false).notNull(),
    inviteTokenHash: text(),
    inviteExpiresAt: timestamp(),
    joinedAt: timestamp(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [unique().on(t.companyId, t.email)],
)
