import { eq } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { asSubject, defineAbilityFor } from '@/auth'
import { database } from '@/database/connection'
import { mentorAccounts, studentProfiles } from '@/database/schema'
import { isValidCpf, maskCpf, maskPixKey, normalizePixKey, onlyDigits, pixKeyTypes, type PixKeyType } from '@/utils/documents'

import { strictRateLimit } from '../rate-limit'
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors/http-errors'

export const studentGoals = ['first_job', 'change_area', 'extra_income', 'own_business', 'learn'] as const

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional()

const studentProfileBody = z.object({
  birthDate: z.iso.date().nullable().optional(),
  city: optionalText(80),
  neighborhood: optionalText(80),
  phone: optionalText(20),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  goal: z.enum(studentGoals).nullable().optional(),
  headline: optionalText(120),
  bio: optionalText(600),
})

const studentProfileResponse = z.object({
  birthDate: z.string().nullable(),
  city: z.string().nullable(),
  neighborhood: z.string().nullable(),
  phone: z.string().nullable(),
  interests: z.array(z.string()),
  goal: z.string().nullable(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  talentVisible: z.boolean(),
  onboardingCompleted: z.boolean(),
  onboardingSkipped: z.boolean(),
})

function ageOn(birthDate: string, today = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00Z`)
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

const mentorAccountBody = z.object({
  fullName: z
    .string()
    .trim()
    .min(5, 'Informe o nome completo.')
    .refine((value) => value.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),
  cpf: z.string().refine(isValidCpf, 'CPF inválido.'),
  birthDate: z.iso.date().refine((value) => ageOn(value) >= 18, 'É preciso ter 18 anos ou mais.'),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((value) => value.length === 10 || value.length === 11, 'Informe o telefone com DDD.'),
  pixKeyType: z.enum(pixKeyTypes),
  pixKey: z.string().trim().min(3),
  bio: z.string().trim().min(30, 'Conte um pouco mais sobre você (mínimo de 30 caracteres).').max(600),
  expertise: z.array(z.string().trim().min(2).max(40)).min(1, 'Escolha ao menos uma área.').max(6),
  acceptTerms: z.literal(true, { error: 'É preciso aceitar os termos para abrir a carteira.' }),
})

const mentorAccountResponse = z.object({
  fullName: z.string(),
  cpfMasked: z.string(),
  birthDate: z.string(),
  phone: z.string(),
  pixKeyType: z.enum(pixKeyTypes),
  pixKeyMasked: z.string(),
  bio: z.string(),
  expertise: z.array(z.string()),
  openedAt: z.date(),
})

function presentAccount(account: typeof mentorAccounts.$inferSelect) {
  const type = account.pixKeyType as PixKeyType
  return {
    fullName: account.fullName,
    cpfMasked: maskCpf(account.cpf),
    birthDate: account.birthDate,
    phone: account.phone,
    pixKeyType: type,
    pixKeyMasked: maskPixKey(type, account.pixKey),
    bio: account.bio,
    expertise: account.expertise,
    openedAt: account.openedAt,
  }
}

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  // ----- Aluno -----
  app.get('/me/student-profile', { schema: { response: { 200: studentProfileResponse } } }, async (request) => {
    const user = await request.requireUser()
    if (user.role !== 'student') throw new ForbiddenError('Disponível só para alunos.')
    const [profile] = await database.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id))
    return {
      birthDate: profile?.birthDate ?? null,
      city: profile?.city ?? null,
      neighborhood: profile?.neighborhood ?? null,
      phone: profile?.phone ?? null,
      interests: profile?.interests ?? [],
      goal: profile?.goal ?? null,
      headline: profile?.headline ?? null,
      bio: profile?.bio ?? null,
      talentVisible: profile?.talentVisible ?? false,
      onboardingCompleted: Boolean(profile?.onboardingCompletedAt),
      onboardingSkipped: Boolean(profile?.onboardingSkippedAt),
    }
  })

  app.put(
    '/me/student-profile',
    {
      schema: {
        body: studentProfileBody.extend({ complete: z.boolean().default(false) }),
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      if (user.role !== 'student') throw new ForbiddenError('Disponível só para alunos.')
      const { complete, ...fields } = request.body

      const values = {
        ...fields,
        updatedAt: new Date(),
        ...(complete ? { onboardingCompletedAt: new Date() } : {}),
      }
      await database
        .insert(studentProfiles)
        .values({ userId: user.id, ...values })
        .onConflictDoUpdate({ target: studentProfiles.userId, set: values })
      return reply.status(204).send(null)
    },
  )

  app.post('/me/student-profile/skip', { schema: { response: { 204: z.null() } } }, async (request, reply) => {
    const user = await request.requireUser()
    if (user.role !== 'student') throw new ForbiddenError('Disponível só para alunos.')
    await database
      .insert(studentProfiles)
      .values({ userId: user.id, onboardingSkippedAt: new Date() })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { onboardingSkippedAt: new Date() } })
    return reply.status(204).send(null)
  })

  // ----- Mentor: abrir a carteira (D13) -----
  app.get('/me/mentor-account', { schema: { response: { 200: mentorAccountResponse } } }, async (request) => {
    const user = await request.requireUser()
    if (!defineAbilityFor(user).can('get', asSubject('MentorAccount', { userId: user.id }))) {
      throw new ForbiddenError('Disponível só para mentores.')
    }
    const [account] = await database.select().from(mentorAccounts).where(eq(mentorAccounts.userId, user.id))
    if (!account) throw new NotFoundError('A carteira ainda não foi aberta.')
    return presentAccount(account)
  })

  app.post(
    '/me/mentor-account',
    {
      config: strictRateLimit,
      schema: { body: mentorAccountBody, response: { 201: mentorAccountResponse } },
    },
    async (request, reply) => {
      const user = await request.requireUser()
      if (user.role !== 'mentor') throw new ForbiddenError('Disponível só para mentores.')
      if (user.walletOpened) throw new ConflictError('A carteira já foi aberta.')

      const body = request.body
      const pixKey = normalizePixKey(body.pixKeyType, body.pixKey)
      if (!pixKey) throw new BadRequestError('Chave Pix inválida para o tipo escolhido.')

      const cpf = onlyDigits(body.cpf)
      const [taken] = await database.select({ userId: mentorAccounts.userId }).from(mentorAccounts).where(eq(mentorAccounts.cpf, cpf))
      if (taken) throw new ConflictError('Este CPF já está cadastrado em outra carteira.')

      const [account] = await database
        .insert(mentorAccounts)
        .values({
          userId: user.id,
          fullName: body.fullName,
          cpf,
          birthDate: body.birthDate,
          phone: body.phone,
          pixKeyType: body.pixKeyType,
          pixKey,
          bio: body.bio,
          expertise: body.expertise,
          termsAcceptedAt: new Date(),
        })
        .returning()
      return reply.status(201).send(presentAccount(account!))
    },
  )

  app.patch(
    '/me/mentor-account',
    {
      schema: {
        body: z.object({
          phone: mentorAccountBody.shape.phone.optional(),
          bio: mentorAccountBody.shape.bio.optional(),
          expertise: mentorAccountBody.shape.expertise.optional(),
          pixKeyType: z.enum(pixKeyTypes).optional(),
          pixKey: z.string().trim().min(3).optional(),
        }),
        response: { 200: mentorAccountResponse },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('update', asSubject('MentorAccount', { userId: user.id }))) {
        throw new ForbiddenError('Disponível só para mentores.')
      }
      const [current] = await database.select().from(mentorAccounts).where(eq(mentorAccounts.userId, user.id))
      if (!current) throw new NotFoundError('A carteira ainda não foi aberta.')

      const { pixKey, pixKeyType, ...rest } = request.body
      const changes: Partial<typeof mentorAccounts.$inferInsert> = { ...rest, updatedAt: new Date() }

      if (pixKey || pixKeyType) {
        const type = (pixKeyType ?? current.pixKeyType) as PixKeyType
        const normalized = normalizePixKey(type, pixKey ?? current.pixKey)
        if (!normalized) throw new BadRequestError('Chave Pix inválida para o tipo escolhido.')
        changes.pixKeyType = type
        changes.pixKey = normalized
      }

      const [account] = await database.update(mentorAccounts).set(changes).where(eq(mentorAccounts.userId, user.id)).returning()
      return presentAccount(account!)
    },
  )
}
