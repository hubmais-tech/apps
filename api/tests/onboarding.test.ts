import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sql as pg } from '@/database/connection'
import { isValidCnpj, isValidCpf, maskCpf, normalizePixKey } from '@/utils/documents'

import { app, call, generateCnpj, generateCpf, openWallet, register, run, type Session } from './helpers'

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
  let otherCompany: Session
  const cnpj = generateCnpj()

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'ob-mentor')
    otherMentor = await register('mentor', 'ob-mentor2')
    student = await register('student', 'ob-aluno')
    company = await register('company', 'ob-empresa')
    otherCompany = await register('company', 'ob-empresa2')
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

  describe('empresa: CNPJ e representantes (D14)', () => {
    const body = (overrides: Record<string, unknown> = {}) => ({
      cnpj,
      legalName: 'Studio Atalaia Comunicação LTDA',
      tradeName: 'Studio Atalaia',
      sector: 'Marketing e publicidade',
      size: 'small',
      city: 'Aracaju',
      state: 'se',
      representative: { jobTitle: 'Gerente de pessoas', phone: '79988887777' },
      ...overrides,
    })

    it('antes do cadastro: onboarding pendente e sem empresa', async () => {
      expect((await call(company, 'GET', '/me')).json().onboarding).toEqual({ required: true, completed: false, path: '/onboarding' })
      expect((await call(company, 'GET', '/company')).statusCode).toBe(404)
      expect((await call(company, 'POST', '/company/members', { name: 'Sem Empresa', jobTitle: 'RH', email: `x-${run}@teste.local` })).statusCode).toBe(403)
    })

    it('rejeita CNPJ inválido e perfil que não é empresa', async () => {
      expect((await call(company, 'POST', '/company', body({ cnpj: '11.111.111/1111-11' }))).statusCode).toBe(400)
      expect((await call(student, 'POST', '/company', body())).statusCode).toBe(403)
    })

    it('cadastra a empresa e o solicitante vira representante principal', async () => {
      expect((await call(company, 'POST', '/company', body())).statusCode).toBe(201)

      const response = (await call(company, 'GET', '/company')).json()
      expect(response).toMatchObject({ cnpj, tradeName: 'Studio Atalaia', state: 'SE', isOwner: true })
      expect(response.members).toHaveLength(1)
      expect(response.members[0]).toMatchObject({ jobTitle: 'Gerente de pessoas', isPrimary: true, status: 'active' })
      expect((await call(company, 'GET', '/me')).json().onboarding.completed).toBe(true)
    })

    it('não repete CNPJ, nem cadastra duas vezes', async () => {
      expect((await call(company, 'POST', '/company', body())).statusCode).toBe(409)
      expect((await call(otherCompany, 'POST', '/company', body())).statusCode).toBe(409)
    })

    it('convida um representante, que aceita o link e passa a ver a mesma empresa', async () => {
      const email = `rep-${run}@teste.local`
      const invited = await call(company, 'POST', '/company/members', { name: 'Paula Representante', jobTitle: 'Analista de RH', email, phone: '79977776666' })
      expect(invited.statusCode).toBe(201)
      const { inviteUrl, memberId } = invited.json()
      const token = inviteUrl.split('/convite/')[1] as string
      expect(token.length).toBeGreaterThan(20)

      expect((await call(company, 'POST', '/company/members', { name: 'Paula Outra', jobTitle: 'RH', email })).statusCode).toBe(409)

      const info = await call(null, 'GET', `/auth/invite/${token}`)
      expect(info.json()).toMatchObject({ name: 'Paula Representante', email, companyName: 'Studio Atalaia' })
      expect((await call(null, 'GET', '/auth/invite/token-inexistente-token-inexistente')).statusCode).toBe(404)
      expect((await call(null, 'POST', '/auth/accept-invite', { token, password: 'curta' })).statusCode).toBe(400)

      const accepted = await call(null, 'POST', '/auth/accept-invite', { token, password: 'senha-forte-123' })
      expect(accepted.statusCode).toBe(201)
      expect(accepted.json().user).toMatchObject({ email, role: 'company', name: 'Paula Representante' })
      const rep: Session = { token: accepted.json().token, id: accepted.json().user.id }

      // O link não pode ser reutilizado.
      expect((await call(null, 'POST', '/auth/accept-invite', { token, password: 'senha-forte-123' })).statusCode).toBe(404)

      const seen = (await call(rep, 'GET', '/company')).json()
      expect(seen).toMatchObject({ cnpj, isOwner: false })
      expect(seen.members.map((m: { status: string }) => m.status)).toEqual(['active', 'active'])
      expect((await call(rep, 'GET', '/me')).json().onboarding.completed).toBe(true)

      // Só o principal remove representantes.
      expect((await call(rep, 'DELETE', `/company/members/${memberId}`)).statusCode).toBe(403)
    })

    it('reemite convite pendente e remove representante', async () => {
      const invited = (await call(company, 'POST', '/company/members', { name: 'Caio Pendente', jobTitle: 'Sócio', email: `caio-${run}@teste.local` })).json()
      const again = await call(company, 'POST', `/company/members/${invited.memberId}/invite`)
      expect(again.statusCode).toBe(200)
      expect(again.json().inviteUrl).not.toBe(invited.inviteUrl)
      // O link antigo deixa de valer.
      const oldToken = invited.inviteUrl.split('/convite/')[1] as string
      expect((await call(null, 'GET', `/auth/invite/${oldToken}`)).statusCode).toBe(404)

      expect((await call(company, 'DELETE', `/company/members/${invited.memberId}`)).statusCode).toBe(204)

      const primary = (await call(company, 'GET', '/company')).json().members.find((m: { isPrimary: boolean }) => m.isPrimary)
      expect((await call(company, 'DELETE', `/company/members/${primary.id}`)).statusCode).toBe(400)
    })

    it('atualiza dados da empresa sem permitir trocar o CNPJ', async () => {
      const response = await call(company, 'PATCH', '/company', { about: 'Agência de conteúdo para negócios locais.', cnpj: generateCnpj() })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ about: 'Agência de conteúdo para negócios locais.', cnpj })
    })
  })
})
