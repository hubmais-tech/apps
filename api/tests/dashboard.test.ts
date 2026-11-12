import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { database, sql as pg } from '@/database/connection'
import { users } from '@/database/schema'
import { computeStreak } from '@/http/routes/dashboard'
import { hashPassword } from '@/utils/password'

import { app, call, createPublishedCourse, enroll, generateCnpj, openWallet, password, register, run, type Session } from './helpers'

describe('sequência de estudo', () => {
  const days = (...list: string[]) => new Set(list)

  it('conta dias seguidos até hoje', () => {
    expect(computeStreak(days('2026-11-08', '2026-11-09', '2026-11-10'), '2026-11-10')).toBe(3)
  })

  it('continua viva se a última atividade foi ontem', () => {
    expect(computeStreak(days('2026-11-08', '2026-11-09'), '2026-11-10')).toBe(2)
  })

  it('zera depois de um dia sem estudar e ignora buracos antigos', () => {
    expect(computeStreak(days('2026-11-07', '2026-11-08'), '2026-11-10')).toBe(0)
    expect(computeStreak(days('2026-11-10', '2026-11-08', '2026-11-07'), '2026-11-10')).toBe(1)
    expect(computeStreak(days(), '2026-11-10')).toBe(0)
  })

  it('atravessa virada de mês e de ano', () => {
    expect(computeStreak(days('2026-12-31', '2027-01-01'), '2027-01-01')).toBe(2)
  })
})

describe('painéis', () => {
  let mentor: Session
  let student: Session
  let company: Session
  let admin: Session
  let courseId: string
  let lessonId: string

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'pn-mentor')
    student = await register('student', 'pn-aluno')
    company = await register('company', 'pn-empresa')
    expect((await openWallet(mentor)).statusCode).toBe(201)

    const course = await createPublishedCourse(mentor, 'Curso do painel', 10000)
    courseId = course.courseId
    lessonId = course.lessonId

    const adminEmail = `admin-pn-${run}@teste.local`
    const [row] = await database.insert(users).values({ name: 'Admin painel', email: adminEmail, role: 'admin', passwordHash: await hashPassword(password) }).returning()
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: adminEmail, password } })
    admin = { token: login.json().token, id: row!.id }
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  it('aluno novo vê o painel vazio, sem números inventados', async () => {
    const dash = (await call(student, 'GET', '/me/dashboard')).json()
    expect(dash.stats).toEqual({ studySeconds: 0, completedLessons: 0, streakDays: 0, certificates: 0, activeCourses: 0, finishedCourses: 0 })
    expect(dash.week).toHaveLength(7)
    expect(dash.week.every((d: { lessons: number }) => d.lessons === 0)).toBe(true)
    expect(dash.tasks).toEqual([])
    expect(dash.talent).toMatchObject({ visible: false, validatedProjects: 0 })
  })

  it('depois de concluir uma aula: horas, sequência e atividade da semana refletem a conclusão', async () => {
    await enroll(student, courseId)
    await call(mentor, 'POST', `/courses/${courseId}/challenges`, { title: 'Desafio do painel', brief: 'Faça algo e conte como foi o processo.' })
    await call(student, 'POST', `/lessons/${lessonId}/complete`)

    const dash = (await call(student, 'GET', '/me/dashboard')).json()
    expect(dash.stats).toMatchObject({ studySeconds: 600, completedLessons: 1, streakDays: 1, activeCourses: 1, finishedCourses: 0, certificates: 0 })
    expect(dash.week.at(-1).lessons).toBe(1)
    expect(dash.tasks).toHaveLength(1)
    expect(dash.tasks[0]).toMatchObject({ title: 'Desafio do painel', state: 'todo', courseTitle: 'Curso do painel' })
  })

  it('a pendência muda de estado conforme a entrega', async () => {
    const challengeId = (await call(student, 'GET', `/courses/${(await call(student, 'GET', '/me/enrollments')).json().enrollments[0].slug}/learn`)).json().challenges[0].id
    const sub = (await call(student, 'PUT', `/challenges/${challengeId}/submission`, { content: 'Fiz o desafio e documentei tudo.', links: [], attachments: [] })).json()
    expect((await call(student, 'GET', '/me/dashboard')).json().tasks[0].state).toBe('in_review')

    await call(mentor, 'POST', `/submissions/${sub.id}/review`, { decision: 'request_changes', feedback: 'Detalhe melhor o processo, por favor.' })
    const task = (await call(student, 'GET', '/me/dashboard')).json().tasks[0]
    expect(task).toMatchObject({ state: 'changes_requested', feedback: 'Detalhe melhor o processo, por favor.' })

    await call(student, 'PUT', `/challenges/${challengeId}/submission`, { content: 'Detalhei melhor o processo, como pedido.', links: [], attachments: [] })
    await call(mentor, 'POST', `/submissions/${sub.id}/review`, { decision: 'approve' })
    const dash = (await call(student, 'GET', '/me/dashboard')).json()
    expect(dash.tasks).toEqual([])
    expect(dash.stats).toMatchObject({ certificates: 1, finishedCourses: 1, activeCourses: 0 })
  })

  it('painel do mentor: precisa da carteira aberta e mostra vendas e entregas pendentes', async () => {
    const closed = await register('mentor', 'pn-mentor-fechado')
    expect((await call(closed, 'GET', '/me/mentor-dashboard')).statusCode).toBe(403)
    expect((await call(student, 'GET', '/me/mentor-dashboard')).statusCode).toBe(403)

    const dash = (await call(mentor, 'GET', '/me/mentor-dashboard')).json()
    expect(dash.courses).toEqual({ total: 1, published: 1 })
    expect(dash.students).toBe(1)
    expect(dash.monthSalesCount).toBe(1)
    expect(dash.monthSalesInCents).toBe(8000)
    expect(dash.wallet.pendingInCents).toBe(8000)
    expect(dash.week.at(-1).sales).toBe(1)
    expect(dash.topCourses[0]).toMatchObject({ title: 'Curso do painel', students: 1 })
    expect(dash.recentSales[0]).toMatchObject({ courseTitle: 'Curso do painel', amountInCents: 8000 })
  })

  it('painel da empresa: precisa do cadastro e conta convites por estado', async () => {
    expect((await call(company, 'GET', '/company/overview')).statusCode).toBe(403)
    await call(company, 'POST', '/company', {
      cnpj: generateCnpj(),
      legalName: 'Empresa do Painel LTDA',
      tradeName: 'Painel Co',
      sector: 'Tecnologia',
      size: 'micro',
      city: 'Aracaju',
      state: 'SE',
      representative: { jobTitle: 'Sócio', phone: '79988887777' },
    })
    const overview = (await call(company, 'GET', '/company/overview')).json()
    expect(overview.invitations).toEqual({ sent: 0, accepted: 0, declined: 0, hired: 0 })
    expect(typeof overview.talentsAvailable).toBe('number')
  })

  it('visão geral do admin: só admin, com totais coerentes', async () => {
    expect((await call(mentor, 'GET', '/admin/overview')).statusCode).toBe(403)
    expect((await call(company, 'GET', '/admin/overview')).statusCode).toBe(403)

    const overview = (await call(admin, 'GET', '/admin/overview')).json()
    expect(overview.users.student).toBeGreaterThanOrEqual(1)
    expect(overview.users.mentor).toBeGreaterThanOrEqual(2)
    expect(overview.sales.paidOrders).toBeGreaterThanOrEqual(1)
    expect(overview.sales.grossInCents).toBeGreaterThanOrEqual(10000)
    expect(overview.sales.platformFeeInCents).toBeGreaterThanOrEqual(2000)
    expect(overview.certificates).toBeGreaterThanOrEqual(1)
    expect(overview.week).toHaveLength(7)
  })
})
