import { randomUUID } from 'node:crypto'

import { expect } from 'vitest'

import { buildApp } from '@/http/app'

export const app = buildApp()
export const run = randomUUID().slice(0, 8)
export const password = 'senha-forte-123'

export type Session = { token: string; id: string }

export async function register(role: 'student' | 'mentor' | 'company', label: string): Promise<Session> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `${label} ${run}`, email: `${label}-${run}@teste.local`, password, role },
  })
  expect(response.statusCode).toBe(201)
  const body = response.json()
  return { token: body.token, id: body.user.id }
}

export const auth = (session: Session) => ({ authorization: `Bearer ${session.token}` })

export async function call(
  session: Session | null,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  payload?: object,
) {
  return app.inject({ method, url, payload, headers: session ? auth(session) : undefined })
}

function randomDigits(length: number) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10))
}

/** CPF com dígitos verificadores corretos, para os testes. */
export function generateCpf() {
  const digits = randomDigits(9)
  for (const length of [9, 10]) {
    let sum = 0
    for (let i = 0; i < length; i++) sum += digits[i]! * (length + 1 - i)
    const rest = (sum * 10) % 11
    digits.push(rest === 10 ? 0 : rest)
  }
  return digits.join('')
}

/** CNPJ com dígitos verificadores corretos, para os testes. */
export function generateCnpj() {
  const digits = [...randomDigits(8), 0, 0, 0, 1]
  for (const weights of [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]) {
    const sum = weights.reduce((acc, weight, i) => acc + digits[i]! * weight, 0)
    const rest = sum % 11
    digits.push(rest < 2 ? 0 : 11 - rest)
  }
  return digits.join('')
}

/** Abre a carteira do mentor (D13) com dados válidos. */
export async function openWallet(session: Session, overrides: Record<string, unknown> = {}) {
  return call(session, 'POST', '/me/mentor-account', {
    fullName: 'Mentor de Teste Silva',
    cpf: generateCpf(),
    birthDate: '1990-05-20',
    phone: '79999990000',
    pixKeyType: 'email',
    pixKey: 'mentor@teste.local',
    bio: 'Mentor de teste com experiência em marketing digital para pequenos negócios.',
    expertise: ['Social media'],
    acceptTerms: true,
    ...overrides,
  })
}

/** Cria um curso publicado, com um módulo e uma aula com vídeo. */
export async function createPublishedCourse(mentor: Session, title: string, priceInCents = 9900) {
  const created = await call(mentor, 'POST', '/courses', { title, description: 'Curso criado nos testes automáticos.', priceInCents })
  expect(created.statusCode).toBe(201)
  const { courseId, slug } = created.json()
  const moduleId = (await call(mentor, 'POST', `/courses/${courseId}/modules`, { title: 'Módulo 1' })).json().moduleId
  const lessonId = (await call(mentor, 'POST', `/modules/${moduleId}/lessons`, { title: 'Aula 1', durationInSeconds: 600, videoKey: `courses/${courseId}/videos/teste.mp4` })).json().lessonId
  expect((await call(mentor, 'POST', `/courses/${courseId}/publish`, { published: true })).statusCode).toBe(204)
  return { courseId: courseId as string, slug: slug as string, lessonId: lessonId as string }
}

/** Compra o curso pelo gateway de testes e matricula o aluno. */
export async function enroll(student: Session, courseId: string) {
  const checkout = await call(student, 'POST', `/courses/${courseId}/checkout`)
  expect(checkout.statusCode).toBe(200)
  expect((await call(student, 'POST', `/dev/orders/${checkout.json().orderId}/pay`)).statusCode).toBe(204)
}
