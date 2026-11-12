import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sql as pg } from '@/database/connection'

import { app, call, openWallet, register, type Session } from './helpers'

describe('construtor de cursos', () => {
  let mentor: Session
  let other: Session
  let courseId: string
  let modA: string
  let modB: string
  const lessons: string[] = []

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'cb-mentor')
    other = await register('mentor', 'cb-mentor2')
    expect((await openWallet(mentor)).statusCode).toBe(201)
    expect((await openWallet(other)).statusCode).toBe(201)

    courseId = (await call(mentor, 'POST', '/courses', { title: 'Curso do construtor', priceInCents: 9900 })).json().courseId
    modA = (await call(mentor, 'POST', `/courses/${courseId}/modules`, { title: 'Módulo A' })).json().moduleId
    modB = (await call(mentor, 'POST', `/courses/${courseId}/modules`, { title: 'Módulo B' })).json().moduleId
    for (const title of ['Aula 1', 'Aula 2', 'Aula 3']) {
      lessons.push((await call(mentor, 'POST', `/modules/${modA}/lessons`, { title })).json().lessonId)
    }
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  const structure = async () => (await call(mentor, 'GET', `/courses/${courseId}/edit`)).json().modules as { id: string; title: string; lessons: { id: string; title: string }[] }[]

  it('renomeia módulo, e outro mentor não pode', async () => {
    expect((await call(mentor, 'PATCH', `/modules/${modA}`, { title: 'Fundamentos' })).statusCode).toBe(204)
    expect((await call(other, 'PATCH', `/modules/${modA}`, { title: 'Invasão' })).statusCode).toBe(403)
    expect((await structure())[0]!.title).toBe('Fundamentos')
  })

  it('reordena módulos e aulas, inclusive movendo aula para outro módulo', async () => {
    const [l1, l2, l3] = lessons as [string, string, string]
    const response = await call(mentor, 'PUT', `/courses/${courseId}/order`, {
      modules: [
        { id: modB, lessonIds: [l3] },
        { id: modA, lessonIds: [l2, l1] },
      ],
    })
    expect(response.statusCode).toBe(204)

    const result = await structure()
    expect(result.map((m) => m.id)).toEqual([modB, modA])
    expect(result[0]!.lessons.map((l) => l.id)).toEqual([l3])
    expect(result[1]!.lessons.map((l) => l.id)).toEqual([l2, l1])
  })

  it('recusa ordem que não bate com o conteúdo do curso', async () => {
    const [l1, l2] = lessons as [string, string]
    // Falta uma aula.
    const missing = await call(mentor, 'PUT', `/courses/${courseId}/order`, {
      modules: [
        { id: modB, lessonIds: [] },
        { id: modA, lessonIds: [l1, l2] },
      ],
    })
    expect(missing.statusCode).toBe(400)

    // Aula repetida.
    const repeated = await call(mentor, 'PUT', `/courses/${courseId}/order`, {
      modules: [
        { id: modB, lessonIds: [l1] },
        { id: modA, lessonIds: [l1, l2, lessons[2]!] },
      ],
    })
    expect(repeated.statusCode).toBe(400)

    expect((await call(other, 'PUT', `/courses/${courseId}/order`, { modules: [{ id: modA, lessonIds: [] }] })).statusCode).toBe(403)
  })
})
