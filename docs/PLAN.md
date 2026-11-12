# Plano de criação do Hub+

Status: aprovado em 2026-11-10. MVP (fases 1 a 4) em construção.

## 1. Limites da engenharia reversa

- O REA não está configurado. O setup não aplicou nada e nenhum motor de análise (Ghidra, jadx etc.) está instalado.
- A skill serve para binários e artefatos empacotados. Alura, Udemy, DIO e Rocketseat são aplicações web, então só a superfície pública das páginas foi analisada.
- A Udemy bloqueou a leitura (HTTP 403). Para ela foi usado conhecimento geral, sem verificação.
- O Instagram exige login, então o logo do Hub+ não foi baixado. O arquivo precisa ser colocado em `docs/`.
- Nada dentro das áreas logadas (player, fóruns, painel do instrutor) foi analisado. Isso exige prints ou HARs, ou o REA configurado.

## 2. Análise dos concorrentes

| Plataforma | Estrutura | O que aproveitar |
|---|---|---|
| Alura | Áreas, 37 carreiras, níveis, planos anuais, Empregabilidade em todos os planos, comunidade, assistente de IA | Trilha com checkpoints práticos, certificados, vagas como parte do plano |
| DIO | Bootcamps gratuitos com empresas, trilhas, desafios reais, projetos de portfólio, comunidade, vagas, "Para Empresas" | Modelo mais próximo do Hub+: curso, portfólio e vaga |
| Rocketseat | Assinatura, formações, "Para Empresas", "Para Escolas" | Formações em sequência e contas de empresa |
| Udemy | Venda avulsa por curso, divisão de receita com o instrutor, avaliações, perguntas e respostas | Venda por curso com divisão de receita, como no modelo do Hub+ |

Os documentos em `docs/` definem o diferencial do Hub+: trilhas curtas de 4 a 6 semanas, desafios reais, Banco de Talentos e recomendação inteligente. Também definem os planos corporativos Essencial, Avançado e Premium, os selos Bronze, Prata e Ouro, e os relatórios de impacto. **Selos e relatórios de impacto ficam para o pós-MVP** (D24).

## 3. Perfis (CASL)

O repositório `hubmais-tech/api` tem 3 perfis (user, mentor, organization_admin). Decidido: 4 perfis (ver `DECISIONS.md`, D1 e D2).

- **student:** compra cursos, faz desafios, mantém o portfólio e participa do Banco de Talentos.
- **mentor:** cria e publica cursos, corrige desafios, vê a carteira e saca a receita.
- **company:** busca talentos, contrata e assina um plano. **A conta é cadastrada pelo Hub+**, com cadastro único por CNPJ, e a empresa escolhe quem a gerencia (D23).
- **admin:** curadoria, cadastro de empresas, doações, carteira do Hub+. Relatórios de impacto e selos são pós-MVP (D24).

Patrocinadores não têm perfil. Doam diretamente ao Hub+. O selo e o relatório de impacto para doadores ficam para o pós-MVP.

## 4. Módulos do produto

**MVP (fases 1 a 4):**

1. Auth: cadastro, login por senha e recuperação de senha.
2. Cursos: curso, módulo e aula, com preço em ingressos (como no repositório base). Vídeos e capas no Cloudflare R2.
3. Compra e carteira: gateway atrás de uma interface (Stripe, ver `DECISIONS.md`, D4) e carteira com ledger interno, estilo Kiwify, com saldo pendente, disponível e saque por Pix. A divisão de receita é feita na compra.
4. Aluno: progresso por aula, desafios com entrega e feedback do mentor, certificado.
5. Portfólio e Banco de Talentos: perfil público do aluno com projetos validados.
6. Empresas: cadastro feito pelo Hub+ (D23), busca com filtros e contratação.

**Fase 2 (depois do MVP):** planos corporativos, registro de doações de empresas (sem perfil de patrocinador), carteira do Hub+ no perfil admin, período de experiência gratuito e recomendação inteligente.

**Pós-MVP (versões futuras, D24):** relatório de impacto e selos (de empresas e de doadores).

## 5. Backend (`api/`)

- **Stack:** Node, Fastify 5, Drizzle, Postgres, Zod, CASL, JWT e Cloudflare R2 pelo SDK do S3.
- **Estrutura:** a do `hubmais-tech/api`: `src/auth` (models, subjects, permissions), `database/schema`, `http/routes/<módulo>`, `http/middlewares`, `services`, `utils`, `env.ts`.
- **Do course-saas-next-rbac:** permissões por perfil com `getUserPermissions` e rotas com erros tipados.
- **Correções ao repositório de base:**
  - Sem CPF obrigatório no cadastro de aluno.
  - Slug de aula único por curso, não global.
  - Upload com URL pré-assinada para vídeo grande, não multipart pela API.
  - Dinheiro sempre em centavos.
  - Sem soft-delete parcial.
- **Tabelas principais:** `users`, `student_profiles`, `companies`, `courses`, `course_tickets`, `modules`, `lessons`, `enrollments`, `lesson_progress`, `challenges`, `submissions`, `orders`, `wallets`, `ledger_entries`, `withdrawals`, `portfolio_items`, `job_requests`, `hires`. Na fase 2: `donations`.

## 6. Front-end (`web/`)

- **Stack:** React, Vite, Tailwind v4, shadcn, lucide, sonner, axios e TanStack Query.
- **Roteamento:** o React Router não está na stack pedida. Proposta de incluí-lo, porque o Vite sozinho não resolve rotas.
- **Telas:** catálogo, página do curso, player, painel do aluno, painel do mentor, painel da empresa, Banco de Talentos, carteira e login.

## 7. Design system

- **Cores principais:** roxo `#5900B0`, areia `#F3CC9F` e laranja `#F26303`.
- **Tema:** claro como padrão, escuro opcional (D11). Painel de SaaS limpo, protótipo aprovado em `docs/design/mockup-workspace.html`.
- **Detalhes:** fundo de partículas discretas na tela de login, cadastro de empresa em passos com barra de progresso (referência Wellhub) e tela de primeiro acesso inspirada em "Crie sua primeira loja".
- **Escalas:** escalas de 50 a 950 geradas a partir das três cores, com teste de contraste.
- **Logo:** `docs/images/logo-hubmais-instagram.jpg` (letras brancas "HUB+" sobre degradê vermelho-alaranjado). O arquivo tem só 150x150 px, então é preciso o original em alta resolução ou SVG.

## 8. Fases

Situação em 2026-11-10.

| # | Fase | Situação |
|---|---|---|
| 1 | Estrutura dos dois projetos, banco no Docker, `env` e design system | Concluída. Falta CI mínima |
| 2 | Auth, perfis e CASL, com testes | Concluída |
| 3 | Cursos, upload no R2 e catálogo | Concluída. Construtor guiado com dropzone (D20) |
| 4 | Compra, carteira e matrícula (Stripe em modo de teste) | Concluída. Stripe real e R2 real ainda sem teste com chaves |
| 5 | Aluno: progresso, desafios, certificado | Concluída (D16, D19) |
| 6 | Portfólio, Banco de Talentos e área da empresa | Concluída, sem planos e sem taxa de contratação (A10, A12) |
| — | Onboarding por perfil, carteira do mentor com CPF e Pix, empresa com CNPJ e representantes | Concluída (D12, D13, D14). O autocadastro de empresa foi trocado pelo **cadastro feito pelo Hub+** (D23), também concluído |
| 7 | Fase 2 (ver abaixo) | **Não iniciada** |

### Fase 2: pendências de produto

O detalhamento em épicos e histórias, com estimativas e plano de sprints, está em `BACKLOG.md`.

Dependem de decisões do responsável (ver "Decisões abertas" em `DECISIONS.md`):

- **Convite por e-mail** do responsável e dos representantes da empresa: hoje o admin e o responsável copiam o link da tela (A11). O cadastro de empresas pelo Hub+ (D23) já está pronto.
- **Planos corporativos** (Essencial, Avançado, Premium): limites e preços em A10. Os selos (Bronze, Prata, Ouro) são pós-MVP.
- **Doações de empresas**, sem perfil de patrocinador: forma de recebimento em A8. Selo e relatório de impacto para doadores são pós-MVP.
- **Taxa de intermediação** sobre contratações: percentual e cobrança em A12.
- **E-mail transacional** (convites de representantes, recuperação de senha, avisos): provedor em A11.
- **Verificação de identidade** do mentor e antifraude de saque: A13.
- **Período de experiência gratuito** e **recomendação inteligente** de cursos e talentos.
- **Stripe real** (A9) e **logo em alta resolução** (A6).

### Pós-MVP (D24)

- **Relatório de impacto** (painel do admin, PDF e relatório para doadores).
- **Selos** das empresas (Bronze, Prata, Ouro) e dos doadores ("Apoiador da Juventude").

### Ideias que não entraram

- Chat entre empresa e talento (hoje o contato é por e-mail e WhatsApp, só após o aceite).
- Notificações dentro da plataforma (sino). Hoje os painéis mostram as pendências.
- Recuperação de senha e troca de senha pela conta (dependem de A11).
- Geração de certificado em PDF no servidor (hoje é página HTML para imprimir).

## 9. Documentação

- `DECISIONS.md`: decisões tomadas (D1 a D24) e pendentes (A6 a A14).
- `FLOWS.md`: fluxos de cada perfil, do cadastro ao resultado.
- `API.md`: referência das rotas.
- `DATA-MODEL.md`: tabelas e regras de dados.
- `BACKLOG.md`: backlog por épico, releases, plano das primeiras sprints, decisões que bloqueiam e riscos. Gerado de `jira/backlog.data.mjs`; o CSV de importação do Jira fica em `jira/hub-backlog.csv`.
- `design/mockup-workspace.html`: protótipo aprovado do design.

## 10. Decisões

Decisões tomadas e pendentes estão em `DECISIONS.md`. Pendentes: logo em alta resolução (A6), doações de empresas (A8), Pix/Connect no Stripe (A9), planos corporativos (A10), e-mail transacional (A11), taxa de contratação (A12) e verificação do mentor (A13).
