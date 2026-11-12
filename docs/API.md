# API do Hub+

Referência das rotas do backend (`api/`, Fastify 5). Esta lista é conferida contra `api/src/http/routes/*.ts`. Quando uma rota mudar, atualize aqui.

## Convenções

- **Base:** `http://localhost:3340` em desenvolvimento (`PORT` no `.env`).
- **Autenticação:** `Authorization: Bearer <token>`. O token é um JWT de 7 dias, devolvido por `/auth/register`, `/auth/login` e `/auth/accept-invite`.
- **Autorização:** toda regra passa pelo CASL (`api/src/auth`). As rotas não checam o perfil na mão. A coluna "Quem" abaixo resume o resultado.
- **Dinheiro:** sempre inteiros em **centavos** (`amountInCents`).
- **Datas:** ISO 8601. Datas de calendário (nascimento) vêm como `YYYY-MM-DD`.
- **Erros:** JSON `{ "message": "texto em português" }`. Validação de corpo devolve `400` com `{ message: "Dados inválidos.", issues: [{ path, message }] }`.

| Status | Quando |
|---|---|
| 400 | Dados inválidos ou regra de negócio violada |
| 401 | Token ausente, inválido ou vencido |
| 403 | Perfil sem permissão (inclui mentor sem carteira aberta e empresa sem cadastro) |
| 404 | Recurso não existe ou não é visível para você |
| 409 | Conflito (e-mail ou CPF já cadastrado, convite já respondido, entrega já aprovada) |
| 429 | Limite de requisições (cadastro e documentos têm limite mais baixo) |

Legenda de "Quem": **público** (sem token), **logado** (qualquer perfil), **aluno**, **mentor** (com carteira aberta, salvo onde indicado), **empresa** (com cadastro completo, salvo onde indicado), **admin**.

## Autenticação e conta

| Método e rota | Quem | O que faz |
|---|---|---|
| `POST /auth/register` | público | Cria conta. Corpo: `name`, `email`, `password` (mín. 8), `role` (`student` ou `mentor`; empresa não se cadastra sozinha, D23; admin só pelo seed). Devolve `{ token, user }` |
| `POST /auth/login` | público | Login por e-mail e senha. Mensagem única para e-mail ou senha errados. 403 para conta de empresa sem empresa vinculada (D23) |
| `GET /me` | logado | `{ user, onboarding }`. `onboarding` = `{ required, completed, path }` (D12) |
| `GET /auth/invite/:token` | público | Dados do convite de representante (nome, cargo, empresa e `isManager`, se é o responsável pela conta). 404 se inválido, usado ou vencido |
| `POST /auth/accept-invite` | público | Representante convidado, inclusive o responsável cadastrado pelo Hub+ (D23), cria a senha. Corpo: `token`, `password`. Devolve `{ token, user }` |

## Perfis e onboarding

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /me/student-profile` | aluno | Perfil opcional do aluno |
| `PUT /me/student-profile` | aluno | Salva campos do perfil (`birthDate`, `city`, `neighborhood`, `phone`, `interests`, `goal`, `headline`, `bio`). `complete: true` conclui o onboarding |
| `POST /me/student-profile/skip` | aluno | Pula o onboarding |
| `GET /me/mentor-account` | mentor | Dados da carteira, com CPF e Pix **mascarados**. 404 se ainda não abriu |
| `POST /me/mentor-account` | mentor | **Abre a carteira** (D13). Valida CPF, maioridade, Pix e termos. 409 se já aberta ou se o CPF já existe |
| `PATCH /me/mentor-account` | mentor | Altera telefone, bio, áreas e chave Pix. Nome, CPF e nascimento não mudam |
| `GET /company` | empresa | Empresa e representantes. `isOwner` indica o responsável pela conta. 404 se a conta não tem empresa |
| `PATCH /company` | empresa | Altera dados. CNPJ e razão social só o Hub+ altera (D23) |
| `POST /company/members` | empresa (responsável) | Cadastra um representante e gera o link de convite (válido por 7 dias) |
| `POST /company/members/:id/invite` | empresa (responsável) | Gera novo link. O anterior deixa de valer |
| `DELETE /company/members/:id` | empresa (responsável) | Remove um representante. O responsável não pode ser removido |
| `POST /company/manager` | empresa (responsável) | Passa a gestão da conta. Corpo: `memberId`. O novo responsável precisa ter ativado o acesso. 204 |

### Empresas cadastradas pelo Hub+ (D23)

| Método e rota | Quem | O que faz |
|---|---|---|
| `POST /admin/companies` | admin | Cadastra a empresa e o responsável indicado. Corpo: dados da empresa, `cnpj` e `manager` (`name`, `jobTitle`, `email`, `phone`). 409 se o CNPJ já existe ou se o e-mail já tem conta. Devolve `inviteUrl` e `inviteExpiresAt` |
| `GET /admin/companies` | admin | Lista com `status` do acesso (`active`, `pending`, `expired`, `no_manager`). Filtros `status` e `q` (nome, CNPJ ou responsável) |
| `GET /admin/companies/:id` | admin | Detalhe: dados, representantes e histórico de trocas de responsável |
| `POST /admin/companies/:id/members/:memberId/invite` | admin | Reenvia o convite de quem ainda não ativou o acesso. O link anterior deixa de valer |
| `POST /admin/companies/:id/manager` | admin | Indica outro responsável a pedido da empresa. Corpo: `memberId` e `note` (quem pediu e por quê, obrigatório). Fica no histórico |

## Cursos

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /courses` | público | Catálogo dos cursos publicados |
| `GET /courses/:slug` | público | Detalhe do curso, módulos e aulas (sem chave de vídeo). Traz `isEnrolled` e `isOwner` quando há token |
| `GET /me/courses` | mentor | Cursos do mentor com vendas |
| `GET /courses/:id/edit` | mentor dono | Estrutura completa para edição |
| `POST /courses` | mentor | Cria o rascunho (preço mínimo R$ 5,00) |
| `PATCH /courses/:id` | mentor dono | Título, descrição, preço, `coverKey` |
| `POST /courses/:id/publish` | mentor dono | Publica ou despublica. Exige ao menos uma aula com vídeo |
| `POST /courses/:id/modules` | mentor dono | Cria módulo |
| `PATCH /modules/:id` | mentor dono | Renomeia módulo |
| `DELETE /modules/:id` | mentor dono | Remove módulo e suas aulas |
| `PUT /courses/:id/order` | mentor dono | Reordena módulos e aulas, inclusive movendo aula entre módulos. A lista precisa conter exatamente o conteúdo atual |
| `POST /modules/:id/lessons` | mentor dono | Cria aula (`title`, `videoKey`, `durationInSeconds`) |
| `PATCH /lessons/:id` | mentor dono | Título, vídeo, duração |
| `DELETE /lessons/:id` | mentor dono | Remove aula |
| `POST /courses/:id/uploads` | mentor dono | URL pré-assinada do R2 para capa ou vídeo. Corpo: `kind`, `contentType`, `size`. Limites em D15 |

## Aprendizado

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /me/enrollments` | logado | Cursos matriculados com progresso |
| `GET /courses/:slug/learn` | aluno matriculado ou mentor dono | Player: módulos, aulas, progresso, `completion`, `certificateCode` e `challenges` (com a entrega do aluno) |
| `GET /lessons/:id/video-url` | aluno matriculado ou mentor dono | URL assinada de leitura do vídeo (2 h) |
| `POST /lessons/:id/complete` | aluno matriculado ou mentor dono | Marca a aula como concluída. Devolve `{ certificateCode }`: preenchido quando essa conclusão fecha o curso (D16). O mentor dono nunca recebe certificado |

## Desafios, entregas e correção (D16)

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /courses/:id/challenges` | mentor dono | Desafios com contagem de entregas e pendências |
| `POST /courses/:id/challenges` | mentor dono | Cria desafio (`title`, `brief`, `criteria`) |
| `PATCH /challenges/:id` | mentor dono | Edita |
| `DELETE /challenges/:id` | mentor dono | Remove. 409 se já tem entregas |
| `POST /challenges/:id/uploads` | aluno matriculado | URL pré-assinada para anexo (imagem, PDF ou ZIP, até 25 MB) |
| `GET /challenges/:id/submission` | logado | Minha entrega (ou `null`), com URLs de leitura dos anexos |
| `PUT /challenges/:id/submission` | aluno matriculado | Cria ou reenvia a entrega (`content`, até 5 `links`, até 5 `attachments`). Reenviar após "ajustes" soma uma tentativa. 409 se já aprovada |
| `GET /me/reviews?status=pending\|all` | mentor | Fila de correção dos cursos do mentor |
| `POST /submissions/:id/review` | mentor dono do curso | `decision`: `approve` ou `request_changes` (feedback obrigatório, mín. 10 caracteres). Aprovar o último desafio pode emitir o certificado e devolve `certificateCode` |

## Certificados, portfólio e visibilidade (D16, D17, D18)

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /me/certificates` | logado | Meus certificados |
| `GET /certificates/:code` | público | Validação do certificado: aluno, curso, mentor, carga horária. Não expõe e-mail |
| `GET /me/portfolio` | aluno | Meus itens, validados e não validados |
| `POST /me/portfolio/uploads` | aluno | URL pré-assinada para a capa de um projeto (imagem até 5 MB) |
| `POST /me/portfolio` | aluno | Cria projeto próprio (nasce **não validado**) |
| `POST /me/portfolio/from-submission/:id` | aluno | Cria item **validado** a partir de uma entrega aprovada sua. 409 se já existe |
| `PATCH /me/portfolio/:id` | aluno | Edita ou oculta (`isPublic`). Se não sobrar projeto validado e público, o aluno sai do Banco de Talentos |
| `DELETE /me/portfolio/:id` | aluno | Remove |
| `GET /me/talent` | aluno | `{ visible, validatedProjects, eligible, hasHeadline }` |
| `PUT /me/talent` | aluno | `{ visible }`. Ligar exige ao menos 1 projeto validado e público |

## Banco de Talentos e convites (D18)

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /talents` | empresa | Busca com `q`, `interest`, `city`, `neighborhood`, `page` (12 por página). Só aparece quem optou por aparecer e tem projeto validado. Nome abreviado |
| `GET /talents/:id` | empresa | Perfil com portfólio validado e cursos. `fullName` e `contact` só depois que o talento **aceita** um convite desta empresa |
| `POST /talents/:id/invitations` | empresa | Envia convite (`roleTitle`, `message` de pelo menos 20 caracteres). 409 se já há convite em andamento |
| `GET /company/invitations` | empresa | Convites enviados |
| `POST /company/invitations/:id/withdraw` | empresa | Retira um convite ainda sem resposta |
| `POST /company/invitations/:id/hire` | empresa | Marca como contratado. Só depois do aceite |
| `GET /me/invitations` | aluno | Convites recebidos (retirados não aparecem) |
| `POST /me/invitations/:id/respond` | aluno | `{ accept }`. 409 se já respondido |

## Painéis (D19)

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /me/dashboard` | logado | Painel do aluno: horas estimadas, sequência, aulas, certificados, atividade dos últimos 7 dias, desafios pendentes, convites e situação no Banco de Talentos |
| `GET /me/mentor-dashboard` | mentor | Cursos, alunos, entregas pendentes, saldo, vendas do mês e da semana, mais vendidos |
| `GET /company/overview` | empresa | Talentos disponíveis e convites por estado |
| `GET /admin/overview` | admin | Usuários por perfil, cursos, vendas, retenção do Hub+, saques a pagar, certificados, convites |

## Pagamentos e carteira

| Método e rota | Quem | O que faz |
|---|---|---|
| `GET /pricing/preview?priceInCents=` | público | Quanto fica com o mentor para um preço (D22): retenção do Hub+, taxa estimada do gateway e valor do mentor. Mínimo de R$ 5,00 |
| `POST /courses/:id/checkout` | logado | Cria o pedido e devolve a URL do gateway (Stripe, ou a tela local em `fake`). Mentor não compra o próprio curso |
| `POST /dev/orders/:id/pay` | comprador (só `PAYMENT_GATEWAY=fake`) | Simula o pagamento aprovado. Não existe em produção |
| `POST /webhooks/stripe` | Stripe (assinatura) | Confirma pagamento, falha, expiração e reembolso. Idempotente |
| `GET /admin/orders` | admin | Pedidos, com retenção do Hub+, taxa estimada do gateway e valor do mentor |
| `POST /admin/orders/:id/refund` | admin | Reembolsa e revoga a matrícula |
| `GET /wallet?scope=me\|platform` | mentor (`me`), admin (`platform`) | Saldos disponível e pendente, extrato e saques |
| `POST /wallet/withdrawals` | mentor, admin | Pede saque. O mentor saca para a chave Pix da carteira (D13); o admin informa a chave do Hub+ |
| `GET /admin/withdrawals` | admin | Saques, com nome completo, CPF e telefone do mentor (só o admin que paga vê o CPF) |
| `POST /admin/withdrawals/:id/pay` | admin | Marca como pago (o Pix é feito por fora) |
| `POST /admin/withdrawals/:id/reject` | admin | Recusa e devolve o valor ao saldo |

## Saúde

`GET /health` devolve `{ status: "ok" }`.
