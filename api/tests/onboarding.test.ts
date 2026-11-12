import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sql as pg } from '@/database/connection'
import { isValidCnpj, isValidCpf, maskCpf, normalizePixKey } from '@/utils/documents'

import { app, call, createAdmin, createCompany, generateCnpj, generateCpf, openWallet, register, type Session } from './helpers'

describe('documentos', () => {
  it('valida CPF e CNPJ pelos dígitos verificadores', () => {
    expect(isValidCpf(generateCpf())).toBe(true)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('123.456.789-00')).toBe(false)
    expect(isValidCnpj(generateCnpj())).toBe(true)
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
    expect(isValidCnpj('12.345.678/0001-00')).toBe(false)
  })

  it('normaliza e valida chaves Pix', () => {
    expect(normalizePixKey('email', ' Ana@Teste.com ')).toBe('ana@teste.com')
    expect(normalizePixKey('phone', '(79) 99999-0000')).toBe('+5579999990000')
    expect(normalizePixKey('phone', '123')).toBeNull()
    expect(normalizePixKey('random', '123e4567-e89b-12d3-a456-426614174000')).not.toBeNull()
    expect(normalizePixKey('random', 'nao-e-uuid')).toBeNull()
    expect(maskCpf('12345678909')).toBe('***.456.789-**')
  })
})

describe('onboarding por perfil', () => {
  let mentor: Session
  let otherMentor: Session
  let student: Session
  let company: Session

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'ob-mentor')
    otherMentor = await register('mentor', 'ob-mentor2')
    student = await register('student', 'ob-aluno')
    company = await createCompany(await createAdmin('ob-admin'), 'ob-empresa').then((c) => c.session)
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  describe('mentor abre a carteira (D13)', () => {
    it('antes de abrir: onboarding pendente e nada de curso, carteira ou saque', async () => {
      const me = (await call(mentor, 'GET', '/me')).json()
      expect(me.onboarding).toEqual({ required: true, completed: false, path: '/onboarding' })

      expect((await call(mentor, 'POST', '/courses', { title: 'Curso cedo demais', priceInCents: 9900 })).statusCode).toBe(403)
      expect((await call(mentor, 'GET', '/wallet')).statusCode).toBe(403)
      expect((await call(mentor, 'GET', '/me/courses')).statusCode).toBe(403)
      expect((await call(mentor, 'GET', '/me/mentor-account')).statusCode).toBe(404)
    })

    it('rejeita CPF inválido, menor de idade, Pix inválido e termos não aceitos', async () => {
      expect((await openWallet(mentor, { cpf: '111.111.111-11' })).statusCode).toBe(400)
      expect((await openWallet(mentor, { birthDate: '2015-01-01' })).statusCode).toBe(400)
      expect((await openWallet(mentor, { pixKeyType: 'phone', pixKey: '123' })).statusCode).toBe(400)
      expect((await openWallet(mentor, { acceptTerms: false })).statusCode).toBe(400)
      expect((await openWallet(mentor, { bio: 'curta' })).statusCode).toBe(400)
      expect((await openWallet(mentor, { fullName: 'Madonna' })).statusCode).toBe(400)
    })

    it('abre a carteira e devolve CPF e Pix mascarados', async () => {
      const cpf = generateCpf()
      const response = await openWallet(mentor, { cpf, pixKeyType: 'cpf', pixKey: cpf })
      expect(response.statusCode).toBe(201)
      const account = response.json()
      expect(account.cpfMasked).toBe(`***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`)
      expect(account.pixKeyMasked).toBe(`…${cpf.slice(-4)}`)
      expect(JSON.stringify(account)).not.toContain(cpf)

      expect((await call(mentor, 'GET', '/me')).json().onboarding.completed).toBe(true)
      expect((await call(mentor, 'POST', '/courses', { title: 'Agora pode', priceInCents: 9900 })).statusCode).toBe(201)
      expect((await call(mentor, 'GET', '/wallet')).statusCode).toBe(200)
    })

    it('não abre duas vezes e não repete CPF entre mentores', async () => {
      expect((await openWallet(mentor)).statusCode).toBe(409)

      const cpf = generateCpf()
      expect((await openWallet(otherMentor, { cpf })).statusCode).toBe(201)

      const another = await register('mentor', 'ob-mentor3')
      expect((await openWallet(another, { cpf })).statusCode).toBe(409)
    })

    it('troca a chave Pix validando o formato', async () => {
      const bad = await call(mentor, 'PATCH', '/me/mentor-account', { pixKeyType: 'cnpj', pixKey: '123' })
      expect(bad.statusCode).toBe(400)

      const ok = await call(mentor, 'PATCH', '/me/mentor-account', { pixKeyType: 'email', pixKey: 'Novo@Teste.com' })
      expect(ok.statusCode).toBe(200)
      expect(ok.json()).toMatchObject({ pixKeyType: 'email', pixKeyMasked: 'no***@teste.com' })
    })

    it('aluno e empresa não acessam a carteira do mentor', async () => {
      expect((await call(student, 'GET', '/me/mentor-account')).statusCode).toBe(403)
      expect((await openWallet(student)).statusCode).toBe(403)
      expect((await call(company, 'GET', '/me/mentor-account')).statusCode).toBe(403)
    })
  })

  describe('aluno (D12)', () => {
    it('onboarding é opcional e pode ser pulado ou concluído', async () => {
      const before = (await call(student, 'GET', '/me')).json().onboarding
      expect(before).toEqual({ required: false, completed: false, path: '/onboarding' })

      const save = await call(student, 'PUT', '/me/student-profile', {
        birthDate: '2003-08-14',
        city: 'Aracaju',
        neighborhood: 'Atalaia',
        interests: ['Social media', 'Design'],
        goal: 'first_job',
        complete: true,
      })
      expect(save.statusCode).toBe(204)

      const profile = (await call(student, 'GET', '/me/student-profile')).json()
      expect(profile).toMatchObject({ city: 'Aracaju', interests: ['Social media', 'Design'], goal: 'first_job', onboardingCompleted: true })
      expect((await call(student, 'GET', '/me')).json().onboarding.completed).toBe(true)
    })

    it('pular não exige nenhum dado, e não pede CPF', async () => {
      const other = await register('student', 'ob-aluno2')
      expect((await call(other, 'POST', '/me/student-profile/skip')).statusCode).toBe(204)
      expect((await call(other, 'GET', '/me')).json().onboarding.completed).toBe(true)
      expect((await call(mentor, 'GET', '/me/student-profile')).statusCode).toBe(403)
    })
  })
})
