import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sql as pg } from '@/database/connection'

import { app, call, createAdmin, createCompany, createOrphanCompanyAccount, createPublishedCourse, enroll, openWallet, register, type Session } from './helpers'

describe('desafios, certificado, portfólio e Banco de Talentos', () => {
  let mentor: Session
  let otherMentor: Session
  let student: Session
  let outsider: Session
  let company: Session
  let orphanCompany: Session
  let courseId: string
  let slug: string
  let lessonId: string
  let challengeId: string
  let submissionId: string
  let certificateCode = ''
  let invitationId: string

  const talentSearch = (session: Session, query = '') => call(session, 'GET', `/talents${query}`)

  beforeAll(async () => {
    await app.ready()
    mentor = await register('mentor', 'en-mentor')
    otherMentor = await register('mentor', 'en-mentor2')
    student = await register('student', 'en-aluno')
    outsider = await register('student', 'en-fora')
    company = (await createCompany(await createAdmin('en-admin'), 'en-empresa', { legalName: 'Empresa de Busca LTDA', tradeName: 'Busca Talentos' })).session
    orphanCompany = await createOrphanCompanyAccount('en-orfa')
    expect((await openWallet(mentor)).statusCode).toBe(201)
    expect((await openWallet(otherMentor)).statusCode).toBe(201)

    const course = await createPublishedCourse(mentor, 'Curso de desafios')
    courseId = course.courseId
    slug = course.slug
    lessonId = course.lessonId
    await enroll(student, courseId)
  })

  afterAll(async () => {
    await app.close()
    await pg.end()
  })

  describe('desafios (D16)', () => {
    it('só o mentor dono cria desafios', async () => {
      const body = { title: 'Calendário editorial', brief: 'Monte o calendário de uma semana para um negócio de Aracaju.', criteria: 'Clareza e consistência.' }
      expect((await call(student, 'POST', `/courses/${courseId}/challenges`, body)).statusCode).toBe(403)
      expect((await call(otherMentor, 'POST', `/courses/${courseId}/challenges`, body)).statusCode).toBe(403)
      expect((await call(mentor, 'POST', `/courses/${courseId}/challenges`, { ...body, brief: 'curto' })).statusCode).toBe(400)

      const created = await call(mentor, 'POST', `/courses/${courseId}/challenges`, body)
      expect(created.statusCode).toBe(201)
      challengeId = created.json().challengeId

      const list = (await call(mentor, 'GET', `/courses/${courseId}/challenges`)).json().challenges
      expect(list).toHaveLength(1)
      expect(list[0]).toMatchObject({ title: 'Calendário editorial', submissionsCount: 0, pendingCount: 0 })
    })

    it('o aluno vê o desafio no player e o curso não está concluído enquanto houver desafio aprovado pendente', async () => {
      await call(student, 'POST', `/lessons/${lessonId}/complete`)
      const learn = (await call(student, 'GET', `/courses/${slug}/learn`)).json()
      expect(learn.challenges).toHaveLength(1)
      expect(learn.challenges[0]).toMatchObject({ id: challengeId, submission: null })
      expect(learn.completion).toMatchObject({ totalLessons: 1, completedLessons: 1, totalChallenges: 1, approvedChallenges: 0, complete: false })
      expect(learn.certificateCode).toBeNull()
    })

    it('só aluno matriculado entrega, e valida conteúdo, links e arquivos', async () => {
      const ok = { content: 'Montei o calendário com três pilares e sete posts.', links: ['https://exemplo.com/calendario'], attachments: [] }
      expect((await call(outsider, 'PUT', `/challenges/${challengeId}/submission`, ok)).statusCode).toBe(403)
      expect((await call(student, 'PUT', `/challenges/${challengeId}/submission`, { ...ok, content: 'curto' })).statusCode).toBe(400)
      expect((await call(student, 'PUT', `/challenges/${challengeId}/submission`, { ...ok, links: ['javascript:alert(1)'] })).statusCode).toBe(400)
      expect((await call(student, 'PUT', `/challenges/${challengeId}/submission`, { ...ok, attachments: [{ key: 'courses/x/videos/a.mp4', name: 'a.mp4', size: 10, contentType: 'video/mp4' }] })).statusCode).toBe(400)

      const sent = await call(student, 'PUT', `/challenges/${challengeId}/submission`, ok)
      expect(sent.statusCode).toBe(200)
      expect(sent.json()).toMatchObject({ status: 'submitted', attempt: 1 })
      submissionId = sent.json().id
    })

    it('gera URL de upload do anexo só para matriculados, com tipo e tamanho válidos', async () => {
      expect((await call(outsider, 'POST', `/challenges/${challengeId}/uploads`, { contentType: 'application/pdf', size: 1000 })).statusCode).toBe(403)
      expect((await call(student, 'POST', `/challenges/${challengeId}/uploads`, { contentType: 'video/mp4', size: 1000 })).statusCode).toBe(400)
      expect((await call(student, 'POST', `/challenges/${challengeId}/uploads`, { contentType: 'application/pdf', size: 26 * 1024 * 1024 })).statusCode).toBe(400)

      const upload = await call(student, 'POST', `/challenges/${challengeId}/uploads`, { contentType: 'application/pdf', size: 2 * 1024 * 1024 })
      expect(upload.statusCode).toBe(200)
      expect(upload.json().key).toMatch(new RegExp(`^submissions/${challengeId}/${student.id}/`))
    })

    it('o mentor vê a entrega pendente e só o mentor do curso corrige', async () => {
      const pending = (await call(mentor, 'GET', '/me/reviews')).json().reviews
      expect(pending.map((r: { id: string }) => r.id)).toContain(submissionId)
      expect((await call(otherMentor, 'GET', '/me/reviews')).json().reviews).toHaveLength(0)
      expect((await call(student, 'GET', '/me/reviews')).statusCode).toBe(403)

      expect((await call(otherMentor, 'POST', `/submissions/${submissionId}/review`, { decision: 'approve' })).statusCode).toBe(403)
      expect((await call(mentor, 'POST', `/submissions/${submissionId}/review`, { decision: 'request_changes', feedback: 'curto' })).statusCode).toBe(400)
    })

    it('pedir ajustes devolve ao aluno, que reenvia com nova tentativa', async () => {
      const review = await call(mentor, 'POST', `/submissions/${submissionId}/review`, { decision: 'request_changes', feedback: 'Faltou definir os horários de cada post.' })
      expect(review.json()).toMatchObject({ status: 'changes_requested', certificateCode: null })

      // Já corrigida: não dá para corrigir de novo até o aluno reenviar.
      expect((await call(mentor, 'POST', `/submissions/${submissionId}/review`, { decision: 'approve' })).statusCode).toBe(409)

      const mine = (await call(student, 'GET', `/challenges/${challengeId}/submission`)).json()
      expect(mine).toMatchObject({ status: 'changes_requested', feedback: 'Faltou definir os horários de cada post.' })

      const again = await call(student, 'PUT', `/challenges/${challengeId}/submission`, { content: 'Agora com horários definidos em cada post.', links: [], attachments: [] })
      expect(again.json()).toMatchObject({ status: 'submitted', attempt: 2, feedback: null })
    })

    it('aprovar o último desafio conclui o curso e emite o certificado', async () => {
      const approved = await call(mentor, 'POST', `/submissions/${submissionId}/review`, { decision: 'approve', feedback: 'Excelente trabalho!' })
      expect(approved.statusCode).toBe(200)
      certificateCode = approved.json().certificateCode
      expect(certificateCode).toMatch(/^HUB-[A-Z0-9]{4}-[A-Z0-9]{4}$/)

      const learn = (await call(student, 'GET', `/courses/${slug}/learn`)).json()
      expect(learn.completion.complete).toBe(true)
      expect(learn.certificateCode).toBe(certificateCode)

      // Entrega aprovada não pode mais ser alterada.
      const edit = await call(student, 'PUT', `/challenges/${challengeId}/submission`, { content: 'Tentando alterar depois de aprovado.', links: [], attachments: [] })
      expect(edit.statusCode).toBe(409)
    })

    it('desafio com entregas não pode ser removido', async () => {
      expect((await call(mentor, 'DELETE', `/challenges/${challengeId}`)).statusCode).toBe(409)
    })
  })

  describe('certificado', () => {
    it('lista os certificados do aluno', async () => {
      const mine = (await call(student, 'GET', '/me/certificates')).json().certificates
      expect(mine).toHaveLength(1)
      expect(mine[0]).toMatchObject({ code: certificateCode, courseTitle: 'Curso de desafios' })
    })

    it('a página pública valida o código sem expor e-mail do aluno', async () => {
      const response = await call(null, 'GET', `/certificates/${certificateCode.toLowerCase()}`)
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body).toMatchObject({ code: certificateCode, courseTitle: 'Curso de desafios', lessonsCount: 1 })
      expect(body.studentName).toContain('en-aluno')
      expect(JSON.stringify(body)).not.toContain('@')

      expect((await call(null, 'GET', '/certificates/HUB-NAOEXISTE')).statusCode).toBe(404)
    })

    it('curso sem desafios conclui ao terminar as aulas', async () => {
      const plain = await createPublishedCourse(mentor, 'Curso sem desafio')
      await enroll(student, plain.courseId)
      const done = await call(student, 'POST', `/lessons/${plain.lessonId}/complete`)
      expect(done.json().certificateCode).toMatch(/^HUB-/)
      // Concluir de novo não emite outro certificado.
      expect((await call(student, 'POST', `/lessons/${plain.lessonId}/complete`)).json().certificateCode).toBe(done.json().certificateCode)
      expect((await call(student, 'GET', '/me/certificates')).json().certificates).toHaveLength(2)
    })

    it('o mentor dono não ganha certificado do próprio curso', async () => {
      const own = await createPublishedCourse(mentor, 'Curso do mentor')
      expect((await call(mentor, 'POST', `/lessons/${own.lessonId}/complete`)).json().certificateCode).toBeNull()
    })
  })

  describe('portfólio e visibilidade (D17 e D18)', () => {
    let itemId: string

    it('só o aluno tem portfólio', async () => {
      expect((await call(mentor, 'GET', '/me/portfolio')).statusCode).toBe(403)
      expect((await call(company, 'GET', '/me/portfolio')).statusCode).toBe(403)
    })

    it('antes de ter projeto validado, não dá para aparecer no Banco de Talentos', async () => {
      const status = (await call(student, 'GET', '/me/talent')).json()
      expect(status).toMatchObject({ visible: false, validatedProjects: 0, eligible: false })
      expect((await call(student, 'PUT', '/me/talent', { visible: true })).statusCode).toBe(400)
    })

    it('projeto manual entra como não validado e não libera o Banco de Talentos', async () => {
      const created = await call(student, 'POST', '/me/portfolio', { title: 'Meu projeto pessoal', description: 'Algo que fiz por conta própria.', links: ['https://exemplo.com/projeto'] })
      expect(created.statusCode).toBe(201)
      const items = (await call(student, 'GET', '/me/portfolio')).json().items
      expect(items[0]).toMatchObject({ title: 'Meu projeto pessoal', validated: false })
      expect((await call(student, 'PUT', '/me/talent', { visible: true })).statusCode).toBe(400)
      expect((await call(student, 'POST', '/me/portfolio', { title: 'Com imagem de outro', coverKey: 'portfolio/outro-usuario/x.png' })).statusCode).toBe(400)
    })

    it('entrega aprovada vira item validado, e só a do próprio aluno', async () => {
      expect((await call(outsider, 'POST', `/me/portfolio/from-submission/${submissionId}`)).statusCode).toBe(404)

      const created = await call(student, 'POST', `/me/portfolio/from-submission/${submissionId}`)
      expect(created.statusCode).toBe(201)
      itemId = created.json().id
      expect((await call(student, 'POST', `/me/portfolio/from-submission/${submissionId}`)).statusCode).toBe(409)

      const items = (await call(student, 'GET', '/me/portfolio')).json().items
      const validated = items.find((i: { id: string }) => i.id === itemId)
      expect(validated).toMatchObject({ title: 'Calendário editorial', validated: true, courseTitle: 'Curso de desafios' })
      expect(validated.validatedByName).toContain('en-mentor')
    })

    it('com projeto validado, o aluno pode aparecer; esconder ou apagar o último projeto tira ele da lista', async () => {
      expect((await call(student, 'PUT', '/me/talent', { visible: true })).statusCode).toBe(204)
      expect((await call(student, 'GET', '/me/talent')).json()).toMatchObject({ visible: true, validatedProjects: 1, eligible: true })

      expect((await call(student, 'PATCH', `/me/portfolio/${itemId}`, { isPublic: false })).statusCode).toBe(204)
      expect((await call(student, 'GET', '/me/talent')).json()).toMatchObject({ visible: false, validatedProjects: 0 })
      expect((await call(student, 'PATCH', `/me/portfolio/${itemId}`, { isPublic: true })).statusCode).toBe(204)
      // Reativar o projeto não religa a visibilidade sozinho.
      expect((await call(student, 'GET', '/me/talent')).json().visible).toBe(false)
      expect((await call(student, 'PUT', '/me/talent', { visible: true })).statusCode).toBe(204)
    })
  })

  describe('Banco de Talentos e convites (D18)', () => {
    it('conta de empresa sem empresa vinculada, aluno e mentor não acessam', async () => {
      expect((await talentSearch(orphanCompany)).statusCode).toBe(403)
      expect((await talentSearch(student)).statusCode).toBe(403)
      expect((await talentSearch(mentor)).statusCode).toBe(403)
    })

    it('empresa cadastrada pelo Hub+ busca talentos e vê só nome abreviado', async () => {
      await call(student, 'PUT', '/me/student-profile', { city: 'Aracaju', neighborhood: 'Atalaia', interests: ['Social media'], headline: 'Social media e conteúdo', phone: '(79) 99999-0000', bio: 'Gosto de criar conteúdo.' })

      const result = (await talentSearch(company)).json()
      const me = result.talents.find((t: { id: string }) => t.id === student.id)
      expect(me).toBeDefined()
      expect(me.displayName).toMatch(/^en-aluno [a-z0-9]{8}$|^en-aluno \w\.$/)
      expect(me).toMatchObject({ headline: 'Social media e conteúdo', neighborhood: 'Atalaia', validatedProjects: 1 })
      expect(JSON.stringify(result)).not.toContain('@teste.local')

      expect((await talentSearch(company, '?interest=Social%20media')).json().talents.some((t: { id: string }) => t.id === student.id)).toBe(true)
      expect((await talentSearch(company, '?interest=Fotografia')).json().talents.some((t: { id: string }) => t.id === student.id)).toBe(false)
      expect((await talentSearch(company, '?q=conte%C3%BAdo')).json().talents.some((t: { id: string }) => t.id === student.id)).toBe(true)
      expect((await talentSearch(company, '?neighborhood=inexistente')).json().total).toBe(0)
    })

    it('o perfil mostra o portfólio validado, mas esconde nome completo e contato antes do aceite', async () => {
      const profile = (await call(company, 'GET', `/talents/${student.id}`)).json()
      expect(profile.portfolio[0]).toMatchObject({ title: 'Calendário editorial', validated: true })
      expect(profile.courses).toContain('Curso de desafios')
      expect(profile.fullName).toBeNull()
      expect(profile.contact).toBeNull()
      expect(profile.invitation).toBeNull()
    })

    it('convida o talento, sem duplicar convite em andamento', async () => {
      const bad = await call(company, 'POST', `/talents/${student.id}/invitations`, { roleTitle: 'Estágio em social media', message: 'curta' })
      expect(bad.statusCode).toBe(400)

      const sent = await call(company, 'POST', `/talents/${student.id}/invitations`, { roleTitle: 'Estágio em social media', message: 'Vimos seu projeto e gostaríamos de conversar sobre uma vaga.' })
      expect(sent.statusCode).toBe(201)
      invitationId = sent.json().invitationId
      expect((await call(company, 'POST', `/talents/${student.id}/invitations`, { roleTitle: 'Outra vaga', message: 'Mensagem repetida com mais de vinte caracteres.' })).statusCode).toBe(409)

      const list = (await call(company, 'GET', '/company/invitations')).json().invitations
      expect(list[0]).toMatchObject({ id: invitationId, status: 'sent', contact: null })
    })

    it('o aluno vê o convite e outro aluno não responde por ele', async () => {
      const mine = (await call(student, 'GET', '/me/invitations')).json().invitations
      expect(mine[0]).toMatchObject({ id: invitationId, companyName: 'Busca Talentos', roleTitle: 'Estágio em social media', status: 'sent' })
      expect((await call(outsider, 'GET', '/me/invitations')).json().invitations).toHaveLength(0)
      expect((await call(outsider, 'POST', `/me/invitations/${invitationId}/respond`, { accept: true })).statusCode).toBe(404)
    })

    it('empresa só marca contratado depois do aceite; o aceite revela nome completo e contato', async () => {
      expect((await call(company, 'POST', `/company/invitations/${invitationId}/hire`)).statusCode).toBe(400)

      expect((await call(student, 'POST', `/me/invitations/${invitationId}/respond`, { accept: true })).statusCode).toBe(204)
      expect((await call(student, 'POST', `/me/invitations/${invitationId}/respond`, { accept: false })).statusCode).toBe(409)

      const profile = (await call(company, 'GET', `/talents/${student.id}`)).json()
      expect(profile.fullName).toContain('en-aluno')
      expect(profile.contact).toMatchObject({ email: expect.stringContaining('@teste.local'), phone: '(79) 99999-0000' })
      expect(profile.invitation.status).toBe('accepted')

      // Convite aceito não pode ser retirado, mas pode virar contratação.
      expect((await call(company, 'POST', `/company/invitations/${invitationId}/withdraw`)).statusCode).toBe(400)
      expect((await call(company, 'POST', `/company/invitations/${invitationId}/hire`)).statusCode).toBe(204)
      expect((await call(company, 'GET', '/company/invitations')).json().invitations[0]).toMatchObject({ status: 'hired' })
    })

    it('convite recusado ou retirado libera um novo convite', async () => {
      const other = await register('student', 'en-aluno2')
      await enroll(other, courseId)
      await call(other, 'POST', `/lessons/${lessonId}/complete`)
      const sub = (await call(other, 'PUT', `/challenges/${challengeId}/submission`, { content: 'Entrega do segundo aluno, com calendário completo.', links: [], attachments: [] })).json()
      expect((await call(mentor, 'POST', `/submissions/${sub.id}/review`, { decision: 'approve' })).statusCode).toBe(200)
      expect((await call(other, 'POST', `/me/portfolio/from-submission/${sub.id}`)).statusCode).toBe(201)
      expect((await call(other, 'PUT', '/me/talent', { visible: true })).statusCode).toBe(204)

      const first = (await call(company, 'POST', `/talents/${other.id}/invitations`, { roleTitle: 'Vaga de social media', message: 'Primeiro convite, com mensagem de teste longa.' })).json().invitationId
      expect((await call(company, 'POST', `/company/invitations/${first}/withdraw`)).statusCode).toBe(204)
      // Convite retirado não aparece para o aluno.
      expect((await call(other, 'GET', '/me/invitations')).json().invitations).toHaveLength(0)

      const second = await call(company, 'POST', `/talents/${other.id}/invitations`, { roleTitle: 'Vaga de social media', message: 'Segundo convite, depois de retirar o primeiro.' })
      expect(second.statusCode).toBe(201)
      expect((await call(other, 'POST', `/me/invitations/${second.json().invitationId}/respond`, { accept: false })).statusCode).toBe(204)
      expect((await call(company, 'POST', `/talents/${other.id}/invitations`, { roleTitle: 'Terceira tentativa', message: 'Depois da recusa, o convite pode ser enviado de novo.' })).statusCode).toBe(201)
    })

    it('talento que sai da lista some da busca e do perfil', async () => {
      expect((await call(student, 'PUT', '/me/talent', { visible: false })).statusCode).toBe(204)
      expect((await talentSearch(company)).json().talents.some((t: { id: string }) => t.id === student.id)).toBe(false)
      expect((await call(company, 'GET', `/talents/${student.id}`)).statusCode).toBe(404)
      expect((await call(company, 'POST', `/talents/${student.id}/invitations`, { roleTitle: 'Vaga nova', message: 'Mensagem com mais de vinte caracteres.' })).statusCode).toBe(404)
    })
  })
})

