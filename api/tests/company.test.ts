import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sql as pg } from '@/database/connection'

import { app, call, companyFields, createAdmin, createCompany, createOrphanCompanyAccount, generateCnpj, password, register, run, type Session } from './helpers'

/** Empresa com cadastro único, feito pelo Hub+, e responsável escolhido pela empresa (D23, épico E15). */
describe('empresa cadastrada pelo Hub+ (D23)', () => {
  let admin: Session
  let student: Session
  let mentor: Session
  let manager: Session
  let companyId: string
  let managerMemberId: string
  let cnpj: string

  const newCompanyBody = (overrides: Record<string, unknown> = {}, managerOverrides: Record<string, unknown> = {}) => ({
    cnpj: generateCnpj(),
    ...companyFields(),
    manager: { name: 'Marina Responsável', jobTitle: 'Gerente de pessoas', email: `marina-${run}-${Math.random().toString(36).slice(2, 6)}@teste.local`, phone: '(79) 98888-7777', ...managerOverrides },
    ...overrides,
  })

  beforeAll(async () => {
    await app.ready()
    admin = await createAdmin('co-admin')
    student = await register('student', 'co-aluno')
    mentor = await register('mentor', 'co-mentor')
    const created = await createCompany(admin, 'co-gestora')
    manager = created.session
    companyId = created.companyId
    managerMemberId = created.memberId
    cnpj = created.cnpj
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  describe('autocadastro fechado (E15-S01)', () => {
    it('a API recusa o perfil de empresa e não cria conta', async () => {
      const email = `sozinha-co-${run}@teste.local`
      const response = await call(null, 'POST', '/auth/register', { name: 'Empresa Sozinha', email, password, role: 'company' })
      expect(response.statusCode).toBe(400)
      expect((await call(null, 'POST', '/auth/login', { email, password })).statusCode).toBe(401)
    })

    it('a rota antiga de cadastro de empresa não existe mais', async () => {
      expect((await call(manager, 'POST', '/company', { cnpj: generateCnpj(), ...companyFields() })).statusCode).toBe(404)
    })

    it('conta antiga de empresa sem empresa vinculada não entra e não acessa nada', async () => {
      const orphan = await createOrphanCompanyAccount('co-orfa')
      const login = await call(null, 'POST', '/auth/login', { email: `co-orfa-${run}@teste.local`, password })
      expect(login.statusCode).toBe(403)
      expect(login.json().message).toMatch(/Hub\+/)

      // Mesmo com um token antigo, a API trava pelas permissões.
      expect((await call(orphan, 'GET', '/me')).json().onboarding).toEqual({ required: true, completed: false, path: '/onboarding' })
      expect((await call(orphan, 'GET', '/company')).statusCode).toBe(404)
      expect((await call(orphan, 'GET', '/talents')).statusCode).toBe(403)
    })

    it('conta de empresa já vinculada continua entrando', async () => {
      const login = await call(null, 'POST', '/auth/login', { email: `co-gestora-${run}@teste.local`, password })
      expect(login.statusCode).toBe(200)
      expect((await call(manager, 'GET', '/me')).json().onboarding.completed).toBe(true)
    })
  })

  describe('admin cadastra a empresa e o responsável (E15-S02)', () => {
    it('só o admin cadastra', async () => {
      for (const who of [student, mentor, manager]) {
        expect((await call(who, 'POST', '/admin/companies', newCompanyBody())).statusCode).toBe(403)
        expect((await call(who, 'GET', '/admin/companies')).statusCode).toBe(403)
      }
      expect((await call(null, 'POST', '/admin/companies', newCompanyBody())).statusCode).toBe(401)
    })

    it('recusa CNPJ inválido, CNPJ repetido e dados do responsável incompletos', async () => {
      const bad = await call(admin, 'POST', '/admin/companies', newCompanyBody({ cnpj: '11.111.111/1111-11' }))
      expect(bad.statusCode).toBe(400)

      const repeated = await call(admin, 'POST', '/admin/companies', newCompanyBody({ cnpj }))
      expect(repeated.statusCode).toBe(409)
      expect(repeated.json().message).toMatch(/CNPJ/)

      const noEmail = await call(admin, 'POST', '/admin/companies', { ...newCompanyBody(), manager: { name: 'Sem Email', jobTitle: 'RH', phone: '79988887777' } })
      expect(noEmail.statusCode).toBe(400)
      const noPhone = await call(admin, 'POST', '/admin/companies', { ...newCompanyBody(), manager: { name: 'Sem Fone', jobTitle: 'RH', email: `sf-${run}@teste.local` } })
      expect(noPhone.statusCode).toBe(400)

      // O e-mail do responsável não pode já ter conta.
      const used = await call(admin, 'POST', '/admin/companies', newCompanyBody({}, { email: `co-aluno-${run}@teste.local` }))
      expect(used.statusCode).toBe(409)
    })

    it('cria a empresa com o responsável principal e um convite de 7 dias', async () => {
      const body = newCompanyBody()
      const created = await call(admin, 'POST', '/admin/companies', body)
      expect(created.statusCode).toBe(201)
      const { companyId: id, inviteUrl, inviteExpiresAt } = created.json()
      expect(inviteUrl).toContain('/convite/')
      const days = (new Date(inviteExpiresAt).getTime() - Date.now()) / 86_400_000
      expect(days).toBeGreaterThan(6.9)
      expect(days).toBeLessThanOrEqual(7)

      const detail = (await call(admin, 'GET', `/admin/companies/${id}`)).json()
      expect(detail).toMatchObject({ tradeName: 'Studio Atalaia', state: 'SE', status: 'pending' })
      expect(detail.members).toHaveLength(1)
      expect(detail.members[0]).toMatchObject({ isPrimary: true, status: 'pending', phone: '79988887777' })
    })
  })

  describe('responsável ativa o acesso (E15-S03)', () => {
    it('ativa pelo convite, entra já na empresa e não passa por cadastro', async () => {
      const created = (await call(admin, 'POST', '/admin/companies', newCompanyBody({}, { name: 'Paulo Ativa' }))).json()
      const token = created.inviteUrl.split('/convite/')[1] as string

      const info = (await call(null, 'GET', `/auth/invite/${token}`)).json()
      expect(info).toMatchObject({ name: 'Paulo Ativa', companyName: 'Studio Atalaia', isManager: true })
      expect((await call(null, 'POST', '/auth/accept-invite', { token, password: 'curta' })).statusCode).toBe(400)

      const accepted = await call(null, 'POST', '/auth/accept-invite', { token, password })
      expect(accepted.statusCode).toBe(201)
      const session: Session = { token: accepted.json().token, id: accepted.json().user.id }

      expect((await call(session, 'GET', '/me')).json().onboarding).toEqual({ required: true, completed: true, path: '/onboarding' })
      const company = (await call(session, 'GET', '/company')).json()
      expect(company).toMatchObject({ id: created.companyId, isOwner: true, tradeName: 'Studio Atalaia' })
      expect(company.members[0]).toMatchObject({ isPrimary: true, status: 'active' })
      expect((await call(session, 'GET', '/talents')).statusCode).toBe(200)
    })

    it('link usado ou vencido não ativa de novo', async () => {
      const created = (await call(admin, 'POST', '/admin/companies', newCompanyBody())).json()
      const token = created.inviteUrl.split('/convite/')[1] as string
      expect((await call(null, 'POST', '/auth/accept-invite', { token, password })).statusCode).toBe(201)
      expect((await call(null, 'POST', '/auth/accept-invite', { token, password })).statusCode).toBe(404)
      expect((await call(null, 'GET', `/auth/invite/${token}`)).statusCode).toBe(404)
    })

    it('razão social e CNPJ só o Hub+ altera', async () => {
      const response = await call(manager, 'PATCH', '/company', { about: 'Agência de conteúdo para negócios locais.', legalName: 'Outro Nome LTDA', cnpj: generateCnpj() })
      expect(response.statusCode).toBe(200)
      expect(response.json()).toMatchObject({ about: 'Agência de conteúdo para negócios locais.', legalName: 'Studio Atalaia Comunicação LTDA', cnpj })
    })
  })

  describe('admin acompanha as empresas (E15-S04)', () => {
    it('lista com estado do acesso e filtra por estado', async () => {
      const pending = (await call(admin, 'POST', '/admin/companies', newCompanyBody({ tradeName: 'Aguardando Ativação' }))).json()

      const all = (await call(admin, 'GET', '/admin/companies')).json().companies as { id: string; status: string; manager: { email: string } | null }[]
      expect(all.find((c) => c.id === companyId)).toMatchObject({ status: 'active' })
      expect(all.find((c) => c.id === pending.companyId)).toMatchObject({ status: 'pending' })

      const onlyPending = (await call(admin, 'GET', '/admin/companies?status=pending')).json().companies as { id: string; status: string }[]
      expect(onlyPending.every((c) => c.status === 'pending')).toBe(true)
      expect(onlyPending.some((c) => c.id === pending.companyId)).toBe(true)

      const byName = (await call(admin, 'GET', '/admin/companies?q=Aguardando')).json().companies as { id: string }[]
      expect(byName.map((c) => c.id)).toContain(pending.companyId)
    })

    it('reenviar o convite invalida o link anterior e não vale para quem já ativou', async () => {
      const created = (await call(admin, 'POST', '/admin/companies', newCompanyBody())).json()
      const again = await call(admin, 'POST', `/admin/companies/${created.companyId}/members/${created.memberId}/invite`)
      expect(again.statusCode).toBe(200)
      expect(again.json().inviteUrl).not.toBe(created.inviteUrl)
      expect((await call(null, 'GET', `/auth/invite/${created.inviteUrl.split('/convite/')[1]}`)).statusCode).toBe(404)
      expect((await call(null, 'GET', `/auth/invite/${again.json().inviteUrl.split('/convite/')[1]}`)).statusCode).toBe(200)

      expect((await call(admin, 'POST', `/admin/companies/${companyId}/members/${managerMemberId}/invite`)).statusCode).toBe(400)
      expect((await call(manager, 'POST', `/admin/companies/${companyId}/members/${managerMemberId}/invite`)).statusCode).toBe(403)
    })
  })

  describe('a empresa escolhe quem gerencia (E15-S05)', () => {
    let secondId: string
    let second: Session
    let pendingId: string

    it('só o responsável adiciona representantes', async () => {
      const added = await call(manager, 'POST', '/company/members', { name: 'Sérgio Segundo', jobTitle: 'Coordenador', email: `sergio-${run}@teste.local`, phone: '79977776666' })
      expect(added.statusCode).toBe(201)
      secondId = added.json().memberId
      const token = added.json().inviteUrl.split('/convite/')[1] as string

      const pending = await call(manager, 'POST', '/company/members', { name: 'Pedro Pendente', jobTitle: 'Analista', email: `pedro-${run}@teste.local` })
      pendingId = pending.json().memberId

      const accepted = await call(null, 'POST', '/auth/accept-invite', { token, password })
      expect(accepted.statusCode).toBe(201)
      second = { token: accepted.json().token, id: accepted.json().user.id }

      // Representante comum não adiciona, não reemite convite e não remove.
      expect((await call(second, 'POST', '/company/members', { name: 'Fora', jobTitle: 'RH', email: `fora-${run}@teste.local` })).statusCode).toBe(403)
      expect((await call(second, 'POST', `/company/members/${pendingId}/invite`)).statusCode).toBe(403)
      expect((await call(second, 'DELETE', `/company/members/${pendingId}`)).statusCode).toBe(403)
      expect((await call(second, 'POST', '/company/manager', { memberId: managerMemberId })).statusCode).toBe(403)
    })

    it('não passa a gestão para quem ainda não ativou o acesso nem para si mesmo', async () => {
      const blocked = await call(manager, 'POST', '/company/manager', { memberId: pendingId })
      expect(blocked.statusCode).toBe(400)
      expect(blocked.json().message).toMatch(/ativar o acesso/)
      expect((await call(manager, 'POST', '/company/manager', { memberId: managerMemberId })).statusCode).toBe(400)
      expect((await call(manager, 'POST', '/company/manager', { memberId: '00000000-0000-4000-8000-000000000000' })).statusCode).toBe(404)
      expect((await call(manager, 'GET', '/company')).json().isOwner).toBe(true)
    })

    it('o responsável passa a gestão e o antigo vira representante comum', async () => {
      expect((await call(manager, 'POST', '/company/manager', { memberId: secondId })).statusCode).toBe(204)

      const asNew = (await call(second, 'GET', '/company')).json()
      expect(asNew.isOwner).toBe(true)
      expect(asNew.members.filter((m: { isPrimary: boolean }) => m.isPrimary)).toHaveLength(1)

      const asOld = (await call(manager, 'GET', '/company')).json()
      expect(asOld.isOwner).toBe(false)
      expect((await call(manager, 'POST', '/company/members', { name: 'Tarde Demais', jobTitle: 'RH', email: `tarde-${run}@teste.local` })).statusCode).toBe(403)
      expect((await call(manager, 'DELETE', `/company/members/${pendingId}`)).statusCode).toBe(403)
      expect((await call(manager, 'POST', '/company/manager', { memberId: secondId })).statusCode).toBe(403)
    })

    it('o novo responsável remove quem quiser, mas o responsável atual não pode ser removido', async () => {
      expect((await call(second, 'DELETE', `/company/members/${managerMemberId}`)).statusCode).toBe(204)
      expect((await call(second, 'DELETE', `/company/members/${secondId}`)).statusCode).toBe(400)
      expect((await call(second, 'DELETE', `/company/members/${pendingId}`)).statusCode).toBe(204)
    })

    it('o histórico registra as trocas, inclusive a indicada pelo admin a pedido da empresa', async () => {
      const added = await call(second, 'POST', '/company/members', { name: 'Tânia Terceira', jobTitle: 'Diretora', email: `tania-${run}@teste.local` })
      const thirdId = added.json().memberId
      const accepted = await call(null, 'POST', '/auth/accept-invite', { token: added.json().inviteUrl.split('/convite/')[1], password })
      expect(accepted.statusCode).toBe(201)

      // O admin precisa registrar quem pediu. Sem a justificativa, recusa.
      expect((await call(admin, 'POST', `/admin/companies/${companyId}/manager`, { memberId: thirdId })).statusCode).toBe(400)
      expect((await call(second, 'POST', `/admin/companies/${companyId}/manager`, { memberId: thirdId, note: 'Pedido por e-mail da diretoria.' })).statusCode).toBe(403)
      const done = await call(admin, 'POST', `/admin/companies/${companyId}/manager`, { memberId: thirdId, note: 'Pedido por e-mail da diretoria: Sérgio saiu da empresa.' })
      expect(done.statusCode).toBe(204)

      const detail = (await call(admin, 'GET', `/admin/companies/${companyId}`)).json()
      expect(detail.members.filter((m: { isPrimary: boolean }) => m.isPrimary).map((m: { name: string }) => m.name)).toEqual(['Tânia Terceira'])
      expect(detail.managerChanges).toHaveLength(2)
      expect(detail.managerChanges[0]).toMatchObject({ origin: 'admin', fromName: 'Sérgio Segundo', toName: 'Tânia Terceira', note: 'Pedido por e-mail da diretoria: Sérgio saiu da empresa.' })
      expect(detail.managerChanges[1]).toMatchObject({ origin: 'company', toName: 'Sérgio Segundo' })
    })
  })
})
