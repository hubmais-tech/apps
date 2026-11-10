import { randomUUID } from 'node:crypto'

import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildApp } from '@/http/app'
import { database, sql as pg } from '@/database/connection'
import { ledgerEntries, users } from '@/database/schema'
import { hashPassword } from '@/utils/password'

const app = buildApp()
const run = randomUUID().slice(0, 8)
const password = 'senha-forte-123'

type Session = { token: string; id: string }

async function register(role: 'student' | 'mentor' | 'company', label: string): Promise<Session> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `${label} ${run}`, email: `${label}-${run}@teste.local`, password, role },
  })
  expect(response.statusCode).toBe(201)
  const body = response.json()
  return { token: body.token, id: body.user.id }
}

const auth = (session: Session) => ({ authorization: `Bearer ${session.token}` })

async function call(
  session: Session | null,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: object,
) {
  return app.inject({ method, url, payload, headers: session ? auth(session) : undefined })
}

describe('fluxo do MVP', () => {
  let mentor: Session
  let otherMentor: Session
  let student: Session
  let company: Session
  let admin: Session
  let courseId: string
  let slug: string
  let lessonId: string
  let orderId: string

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'mentor')
    otherMentor = await register('mentor', 'mentor2')
    student = await register('student', 'aluno')
    company = await register('company', 'empresa')

    const adminEmail = `admin-${run}@teste.local`
    const [row] = await database
      .insert(users)
      .values({ name: 'Admin teste', email: adminEmail, role: 'admin', passwordHash: await hashPassword(password) })
      .returning()
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: adminEmail, password },
    })
    admin = { token: login.json().token, id: row.id }
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  it('não permite cadastro como admin', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'X', email: `x-${run}@teste.local`, password, role: 'admin' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('recusa login com senha errada e e-mail duplicado', async () => {
    const wrong = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `aluno-${run}@teste.local`, password: 'errada-errada' },
    })
    expect(wrong.statusCode).toBe(401)

    const duplicate = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Aluno', email: `aluno-${run}@teste.local`, password },
    })
    expect(duplicate.statusCode).toBe(409)
  })

  it('aluno não cria curso; mentor cria', async () => {
    const denied = await call(student, 'POST', '/courses', { title: 'Curso do aluno', priceInCents: 1000 })
    expect(denied.statusCode).toBe(403)

    const created = await call(mentor, 'POST', '/courses', {
      title: 'Social Media na Prática',
      description: 'Curso curto',
      priceInCents: 10000,
    })
    expect(created.statusCode).toBe(201)
    courseId = created.json().courseId
    slug = created.json().slug
  })

  it('rejeita preço abaixo do mínimo', async () => {
    const response = await call(mentor, 'POST', '/courses', { title: 'Barato demais', priceInCents: 100 })
    expect(response.statusCode).toBe(400)
  })

  it('outro mentor não edita o curso', async () => {
    const response = await call(otherMentor, 'PATCH', `/courses/${courseId}`, { title: 'Sequestrado' })
    expect(response.statusCode).toBe(403)
  })

  it('não publica sem aula com vídeo', async () => {
    const response = await call(mentor, 'POST', `/courses/${courseId}/publish`, { published: true })
    expect(response.statusCode).toBe(400)
  })

  it('gera URL de upload e monta módulo e aula', async () => {
    const bad = await call(mentor, 'POST', `/courses/${courseId}/uploads`, {
      kind: 'video',
      contentType: 'application/pdf',
    })
    expect(bad.statusCode).toBe(400)

    const upload = await call(mentor, 'POST', `/courses/${courseId}/uploads`, {
      kind: 'video',
      contentType: 'video/mp4',
    })
    expect(upload.statusCode).toBe(200)
    const { key, uploadUrl } = upload.json()
    expect(key).toMatch(new RegExp(`^courses/${courseId}/videos/`))
    expect(uploadUrl).toContain('X-Amz-Signature')

    const foreign = await call(mentor, 'POST', `/courses/${courseId}/modules`, { title: 'Módulo 1' })
    expect(foreign.statusCode).toBe(201)
    const moduleId = foreign.json().moduleId

    const stolen = await call(mentor, 'POST', `/modules/${moduleId}/lessons`, {
      title: 'Aula com vídeo alheio',
      videoKey: `courses/${randomUUID()}/videos/x.mp4`,
    })
    expect(stolen.statusCode).toBe(400)

    const lesson = await call(mentor, 'POST', `/modules/${moduleId}/lessons`, {
      title: 'Aula 1',
      videoKey: key,
      durationInSeconds: 300,
    })
    expect(lesson.statusCode).toBe(201)
    lessonId = lesson.json().lessonId

    const publish = await call(mentor, 'POST', `/courses/${courseId}/publish`, { published: true })
    expect(publish.statusCode).toBe(204)
  })

  it('catálogo mostra o curso e o detalhe não vaza a chave do vídeo', async () => {
    const list = await call(null, 'GET', '/courses')
    expect(list.json().courses.some((c: { id: string }) => c.id === courseId)).toBe(true)

    const detail = await call(null, 'GET', `/courses/${slug}`)
    expect(detail.statusCode).toBe(200)
    expect(JSON.stringify(detail.json())).not.toContain('videoKey')
    expect(detail.json().isEnrolled).toBe(false)
  })

  it('sem matrícula não acessa vídeo nem player', async () => {
    expect((await call(student, 'GET', `/lessons/${lessonId}/video-url`)).statusCode).toBe(403)
    expect((await call(student, 'GET', `/courses/${slug}/learn`)).statusCode).toBe(403)
    expect((await call(null, 'GET', `/lessons/${lessonId}/video-url`)).statusCode).toBe(401)
  })

  it('mentor não compra o próprio curso', async () => {
    const response = await call(mentor, 'POST', `/courses/${courseId}/checkout`)
    expect(response.statusCode).toBe(400)
  })

  it('compra: checkout cria pedido pendente e o pagamento matricula e credita a carteira', async () => {
    const checkout = await call(student, 'POST', `/courses/${courseId}/checkout`)
    expect(checkout.statusCode).toBe(200)
    orderId = checkout.json().orderId

    const paid = await call(student, 'POST', `/dev/orders/${orderId}/pay`)
    expect(paid.statusCode).toBe(204)

    // idempotente
    await call(student, 'POST', `/dev/orders/${orderId}/pay`)

    const video = await call(student, 'GET', `/lessons/${lessonId}/video-url`)
    expect(video.statusCode).toBe(200)
    expect(video.json().url).toContain('X-Amz-Signature')

    const again = await call(student, 'POST', `/courses/${courseId}/checkout`)
    expect(again.statusCode).toBe(400)
  })

  it('divide a venda: 80% mentor, 20% Hub+, ambos pendentes pela janela de garantia', async () => {
    const mentorWallet = (await call(mentor, 'GET', '/wallet')).json()
    expect(mentorWallet.pendingInCents).toBe(8000)
    expect(mentorWallet.availableInCents).toBe(0)

    const platform = (await call(admin, 'GET', '/wallet?scope=platform')).json()
    expect(platform.pendingInCents).toBeGreaterThanOrEqual(2000)
  })

  it('só admin vê a carteira do Hub+; aluno não tem carteira', async () => {
    expect((await call(mentor, 'GET', '/wallet?scope=platform')).statusCode).toBe(403)
    expect((await call(student, 'GET', '/wallet')).statusCode).toBe(403)
    expect((await call(company, 'GET', '/wallet')).statusCode).toBe(403)
  })

  it('progresso da aula é registrado', async () => {
    expect((await call(student, 'POST', `/lessons/${lessonId}/complete`)).statusCode).toBe(204)
    const learn = (await call(student, 'GET', `/courses/${slug}/learn`)).json()
    expect(learn.modules[0].lessons[0].completed).toBe(true)

    const mine = (await call(student, 'GET', '/me/enrollments')).json()
    expect(mine.enrollments[0]).toMatchObject({ totalLessons: 1, completedLessons: 1 })
  })

  it('saque: bloqueado enquanto o saldo está pendente', async () => {
    const response = await call(mentor, 'POST', '/wallet/withdrawals', {
      amountInCents: 5000,
      pixKey: 'mentor@teste.local',
      pixKeyType: 'email',
    })
    expect(response.statusCode).toBe(400)
  })

  it('saque: liberado após a janela, valida mínimo e saldo, e o admin paga', async () => {
    // Simula o fim da janela de garantia deslocando a data de liberação para o passado.
    await database
      .update(ledgerEntries)
      .set({ availableAt: sql`now() - interval '1 minute'` })
      .where(eq(ledgerEntries.userId, mentor.id))

    expect((await call(mentor, 'GET', '/wallet')).json().availableInCents).toBe(8000)

    const tooLow = await call(mentor, 'POST', '/wallet/withdrawals', {
      amountInCents: 1000,
      pixKey: 'mentor@teste.local',
      pixKeyType: 'email',
    })
    expect(tooLow.statusCode).toBe(400)

    const tooHigh = await call(mentor, 'POST', '/wallet/withdrawals', {
      amountInCents: 9000,
      pixKey: 'mentor@teste.local',
      pixKeyType: 'email',
    })
    expect(tooHigh.statusCode).toBe(400)

    const attempt = () =>
      call(mentor, 'POST', '/wallet/withdrawals', {
        amountInCents: 5000,
        pixKey: 'mentor@teste.local',
        pixKeyType: 'email',
      })

    // Corrida: dois saques simultâneos de 5000 com 8000 disponíveis. Só um pode passar.
    const race = await Promise.all([attempt(), attempt()])
    expect(race.map((r) => r.statusCode).sort()).toEqual([201, 400])
    const raced = race.find((r) => r.statusCode === 201)!.json().withdrawalId
    expect((await call(mentor, 'GET', '/wallet')).json().availableInCents).toBe(3000)

    expect((await call(mentor, 'POST', `/admin/withdrawals/${raced}/pay`, {})).statusCode).toBe(403)

    // Recusar devolve o valor ao saldo.
    expect((await call(admin, 'POST', `/admin/withdrawals/${raced}/reject`, { note: 'Chave inválida' })).statusCode).toBe(204)
    expect((await call(mentor, 'GET', '/wallet')).json().availableInCents).toBe(8000)

    const ok = await attempt()
    expect(ok.statusCode).toBe(201)
    const withdrawalId = ok.json().withdrawalId

    expect((await call(admin, 'POST', `/admin/withdrawals/${withdrawalId}/pay`, { note: 'Pix enviado' })).statusCode).toBe(204)
    expect((await call(admin, 'POST', `/admin/withdrawals/${withdrawalId}/pay`, {})).statusCode).toBe(400)
    expect((await call(mentor, 'GET', '/wallet')).json().availableInCents).toBe(3000)
  })

  it('reembolso revoga o acesso e estorna os lançamentos', async () => {
    const before = (await call(admin, 'GET', '/wallet?scope=platform')).json()

    expect((await call(student, 'POST', `/admin/orders/${orderId}/refund`)).statusCode).toBe(403)
    expect((await call(admin, 'POST', `/admin/orders/${orderId}/refund`)).statusCode).toBe(204)
    expect((await call(admin, 'POST', `/admin/orders/${orderId}/refund`)).statusCode).toBe(400)

    expect((await call(student, 'GET', `/lessons/${lessonId}/video-url`)).statusCode).toBe(403)

    const after = (await call(admin, 'GET', '/wallet?scope=platform')).json()
    expect(before.pendingInCents - after.pendingInCents).toBe(2000)
  })
})
