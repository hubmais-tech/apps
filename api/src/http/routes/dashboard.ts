import { and, asc, count, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { defineAbilityFor } from '@/auth'
import { database } from '@/database/connection'
import {
  certificates,
  challenges,
  courses,
  enrollments,
  invitations,
  lessonProgress,
  lessons,
  modules,
  orders,
  portfolioItems,
  studentProfiles,
  submissions,
  users,
  withdrawals,
} from '@/database/schema'
import { getBalances } from '@/services/wallet'

import { ForbiddenError } from '../errors/http-errors'

/** Dia local do Hub+ (Aracaju, UTC-3). A sequência de estudo conta dias nesse fuso. */
const TZ = 'America/Maceio'
const dayOf = (column: unknown) => sql<string>`to_char((${column} at time zone 'UTC') at time zone ${TZ}, 'YYYY-MM-DD')`

function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)
}

function addDays(key: string, delta: number) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Dias seguidos com atividade. A sequência continua viva se a última atividade foi hoje ou ontem. */
export function computeStreak(activeDays: Set<string>, today: string) {
  let cursor = activeDays.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (activeDays.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export const dashboardRoutes: FastifyPluginAsyncZod = async (app) => {
  // ----- Aluno (D19) -----
  app.get(
    '/me/dashboard',
    {
      schema: {
        response: {
          200: z.object({
            stats: z.object({
              studySeconds: z.number(),
              completedLessons: z.number(),
              streakDays: z.number(),
              certificates: z.number(),
              activeCourses: z.number(),
              finishedCourses: z.number(),
            }),
            week: z.array(z.object({ date: z.string(), lessons: z.number() })),
            tasks: z.array(
              z.object({
                challengeId: z.uuid(),
                courseSlug: z.string(),
                courseTitle: z.string(),
                title: z.string(),
                state: z.enum(['todo', 'changes_requested', 'in_review']),
                feedback: z.string().nullable(),
              }),
            ),
            invitationsPending: z.number(),
            talent: z.object({ visible: z.boolean(), validatedProjects: z.number(), hasHeadline: z.boolean(), portfolioItems: z.number() }),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()

      const done = await database
        .select({ completedAt: lessonProgress.completedAt, seconds: lessons.durationInSeconds, day: dayOf(lessonProgress.completedAt) })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(eq(lessonProgress.userId, user.id))

      const today = dayKey(new Date())
      const days = new Set(done.map((d) => d.day))
      const week = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6)
        return { date, lessons: done.filter((d) => d.day === date).length }
      })

      // Cursos matriculados, concluídos ou em andamento.
      const enrolled = await database.select({ courseId: enrollments.courseId, slug: courses.slug, title: courses.title }).from(enrollments).innerJoin(courses, eq(courses.id, enrollments.courseId)).where(eq(enrollments.userId, user.id))
      const lessonsByCourse = enrolled.length
        ? await database
            .select({ id: lessons.id, courseId: modules.courseId })
            .from(lessons)
            .innerJoin(modules, eq(modules.id, lessons.moduleId))
            .where(inArray(modules.courseId, enrolled.map((e) => e.courseId)))
        : []
      const doneIds = new Set((await database.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress).where(eq(lessonProgress.userId, user.id))).map((d) => d.lessonId))
      // Pendências: desafios dos cursos matriculados sem entrega aprovada.
      const challengeRows = enrolled.length
        ? await database.select().from(challenges).where(inArray(challenges.courseId, enrolled.map((e) => e.courseId))).orderBy(asc(challenges.position))
        : []
      const mine = challengeRows.length ? await database.select().from(submissions).where(and(eq(submissions.userId, user.id), inArray(submissions.challengeId, challengeRows.map((c) => c.id)))) : []
      // Concluído = todas as aulas feitas e todos os desafios aprovados (D16).
      const finished = enrolled.filter((e) => {
        const own = lessonsByCourse.filter((l) => l.courseId === e.courseId)
        const ownChallenges = challengeRows.filter((c) => c.courseId === e.courseId)
        const allApproved = ownChallenges.every((c) => mine.some((s) => s.challengeId === c.id && s.status === 'approved'))
        return own.length > 0 && own.every((l) => doneIds.has(l.id)) && allApproved
      })

      const tasks = challengeRows.flatMap((c) => {
        const submission = mine.find((s) => s.challengeId === c.id)
        if (submission?.status === 'approved') return []
        const course = enrolled.find((e) => e.courseId === c.courseId)!
        return [
          {
            challengeId: c.id,
            courseSlug: course.slug,
            courseTitle: course.title,
            title: c.title,
            state: submission ? (submission.status === 'submitted' ? ('in_review' as const) : ('changes_requested' as const)) : ('todo' as const),
            feedback: submission?.feedback ?? null,
          },
        ]
      })

      const [{ certs }] = await database.select({ certs: count() }).from(certificates).where(eq(certificates.userId, user.id))
      const [{ pending }] = await database.select({ pending: count() }).from(invitations).where(and(eq(invitations.studentId, user.id), eq(invitations.status, 'sent')))
      const [profile] = await database.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id))
      const items = await database.select({ validatedAt: portfolioItems.validatedAt, isPublic: portfolioItems.isPublic }).from(portfolioItems).where(eq(portfolioItems.userId, user.id))
      const validated = items.filter((i) => i.validatedAt && i.isPublic).length

      return {
        stats: {
          // A plataforma não mede o tempo assistido: é a soma da duração das aulas concluídas (D19).
          studySeconds: done.reduce((sum, d) => sum + d.seconds, 0),
          completedLessons: done.length,
          streakDays: computeStreak(days, today),
          certificates: certs,
          activeCourses: enrolled.length - finished.length,
          finishedCourses: finished.length,
        },
        week,
        tasks: tasks.slice(0, 6),
        invitationsPending: pending,
        talent: { visible: Boolean(profile?.talentVisible) && validated > 0, validatedProjects: validated, hasHeadline: Boolean(profile?.headline), portfolioItems: items.length },
      }
    },
  )

  // ----- Mentor -----
  app.get(
    '/me/mentor-dashboard',
    {
      schema: {
        response: {
          200: z.object({
            courses: z.object({ total: z.number(), published: z.number() }),
            students: z.number(),
            pendingReviews: z.number(),
            wallet: z.object({ availableInCents: z.number(), pendingInCents: z.number() }),
            monthSalesInCents: z.number(),
            monthSalesCount: z.number(),
            week: z.array(z.object({ date: z.string(), sales: z.number() })),
            topCourses: z.array(z.object({ id: z.uuid(), title: z.string(), students: z.number() })),
            recentSales: z.array(z.object({ id: z.uuid(), courseTitle: z.string(), amountInCents: z.number(), paidAt: z.date() })),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('create', 'Course')) throw new ForbiddenError('Abra a carteira para acessar o painel de mentor.')

      const own = await database.select({ id: courses.id, title: courses.title, isPublished: courses.isPublished }).from(courses).where(eq(courses.mentorId, user.id))
      const ownIds = own.map((c) => c.id)

      const students = ownIds.length ? await database.select({ courseId: enrollments.courseId, total: count() }).from(enrollments).where(inArray(enrollments.courseId, ownIds)).groupBy(enrollments.courseId) : []
      const [{ pendingReviews }] = await database
        .select({ pendingReviews: count() })
        .from(submissions)
        .innerJoin(challenges, eq(challenges.id, submissions.challengeId))
        .innerJoin(courses, eq(courses.id, challenges.courseId))
        .where(and(eq(courses.mentorId, user.id), eq(submissions.status, 'submitted')))

      const today = dayKey(new Date())
      const monthStart = new Date(`${today.slice(0, 7)}-01T03:00:00Z`)
      const paid = await database
        .select({ id: orders.id, courseId: orders.courseId, mentorAmountInCents: orders.mentorAmountInCents, paidAt: orders.paidAt, day: dayOf(orders.paidAt) })
        .from(orders)
        .where(and(eq(orders.mentorId, user.id), eq(orders.status, 'paid')))
        .orderBy(desc(orders.paidAt))

      const month = paid.filter((o) => o.paidAt && o.paidAt >= monthStart)
      return {
        courses: { total: own.length, published: own.filter((c) => c.isPublished).length },
        students: students.reduce((sum, s) => sum + s.total, 0),
        pendingReviews,
        wallet: await getBalances(database, user.id),
        monthSalesInCents: month.reduce((sum, o) => sum + o.mentorAmountInCents, 0),
        monthSalesCount: month.length,
        week: Array.from({ length: 7 }, (_, i) => {
          const date = addDays(today, i - 6)
          return { date, sales: paid.filter((o) => o.day === date).length }
        }),
        topCourses: own
          .map((c) => ({ id: c.id, title: c.title, students: students.find((s) => s.courseId === c.id)?.total ?? 0 }))
          .sort((a, b) => b.students - a.students)
          .slice(0, 4),
        recentSales: paid.slice(0, 5).map((o) => ({ id: o.id, courseTitle: own.find((c) => c.id === o.courseId)?.title ?? '', amountInCents: o.mentorAmountInCents, paidAt: o.paidAt! })),
      }
    },
  )

  // ----- Empresa -----
  app.get(
    '/company/overview',
    {
      schema: {
        response: {
          200: z.object({
            talentsAvailable: z.number(),
            invitations: z.object({ sent: z.number(), accepted: z.number(), declined: z.number(), hired: z.number() }),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!user.companyId || !defineAbilityFor(user).can('get', 'Talent')) throw new ForbiddenError('Cadastre a sua empresa primeiro.')

      const [{ talents }] = await database
        .select({ talents: sql<number>`count(distinct ${studentProfiles.userId})::int` })
        .from(studentProfiles)
        .innerJoin(portfolioItems, eq(portfolioItems.userId, studentProfiles.userId))
        .where(and(eq(studentProfiles.talentVisible, true), sql`${portfolioItems.validatedAt} is not null`, eq(portfolioItems.isPublic, true)))

      const rows = await database.select({ status: invitations.status, total: count() }).from(invitations).where(eq(invitations.companyId, user.companyId)).groupBy(invitations.status)
      const by = (status: string) => rows.find((r) => r.status === status)?.total ?? 0
      return { talentsAvailable: talents, invitations: { sent: by('sent'), accepted: by('accepted'), declined: by('declined'), hired: by('hired') } }
    },
  )

  // ----- Admin -----
  app.get(
    '/admin/overview',
    {
      schema: {
        response: {
          200: z.object({
            users: z.object({ student: z.number(), mentor: z.number(), company: z.number(), newLast7Days: z.number() }),
            courses: z.object({ total: z.number(), published: z.number() }),
            sales: z.object({ paidOrders: z.number(), grossInCents: z.number(), platformFeeInCents: z.number(), refunded: z.number() }),
            withdrawals: z.object({ requested: z.number(), requestedInCents: z.number() }),
            certificates: z.number(),
            invitations: z.object({ total: z.number(), hired: z.number() }),
            week: z.array(z.object({ date: z.string(), orders: z.number(), users: z.number() })),
          }),
        },
      },
    },
    async (request) => {
      const user = await request.requireUser()
      if (!defineAbilityFor(user).can('manage', 'all')) throw new ForbiddenError('Acesso restrito ao admin.')

      const today = dayKey(new Date())
      const sinceWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const roleRows = await database.select({ role: users.role, total: count() }).from(users).groupBy(users.role)
      const byRole = (role: string) => roleRows.find((r) => r.role === role)?.total ?? 0
      const [{ fresh }] = await database.select({ fresh: count() }).from(users).where(gte(users.createdAt, sinceWeek))

      const courseRows = await database.select({ isPublished: courses.isPublished, total: count() }).from(courses).groupBy(courses.isPublished)
      const orderRows = await database.select({ status: orders.status, total: count(), gross: sql<number>`coalesce(sum(${orders.amountInCents}), 0)::int`, fee: sql<number>`coalesce(sum(${orders.platformFeeInCents}), 0)::int` }).from(orders).groupBy(orders.status)
      const paid = orderRows.find((r) => r.status === 'paid')

      const [pending] = await database.select({ total: count(), amount: sql<number>`coalesce(sum(${withdrawals.amountInCents}), 0)::int` }).from(withdrawals).where(eq(withdrawals.status, 'requested'))
      const [{ certs }] = await database.select({ certs: count() }).from(certificates)
      const [{ invited }] = await database.select({ invited: count() }).from(invitations)
      const [{ hired }] = await database.select({ hired: count() }).from(invitations).where(eq(invitations.status, 'hired'))

      const recentOrders = await database.select({ day: dayOf(orders.paidAt) }).from(orders).where(and(eq(orders.status, 'paid'), gte(orders.paidAt, sinceWeek)))
      const recentUsers = await database.select({ day: dayOf(users.createdAt) }).from(users).where(gte(users.createdAt, sinceWeek))

      return {
        users: { student: byRole('student'), mentor: byRole('mentor'), company: byRole('company'), newLast7Days: fresh },
        courses: { total: courseRows.reduce((s, r) => s + r.total, 0), published: courseRows.find((r) => r.isPublished)?.total ?? 0 },
        sales: { paidOrders: paid?.total ?? 0, grossInCents: paid?.gross ?? 0, platformFeeInCents: paid?.fee ?? 0, refunded: orderRows.find((r) => r.status === 'refunded')?.total ?? 0 },
        withdrawals: { requested: pending?.total ?? 0, requestedInCents: pending?.amount ?? 0 },
        certificates: certs,
        invitations: { total: invited, hired },
        week: Array.from({ length: 7 }, (_, i) => {
          const date = addDays(today, i - 6)
          return { date, orders: recentOrders.filter((o) => o.day === date).length, users: recentUsers.filter((u) => u.day === date).length }
        }),
      }
    },
  )

}
