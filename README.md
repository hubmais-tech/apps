# Hub+ (Hub Juventude+)

Plataforma digital de formação e conexão profissional para jovens de 18 a 26 anos de Aracaju (SE) e região. Une cursos curtos (4 a 6 semanas), desafios práticos com certificado, portfólio e um Banco de Talentos onde empresas encontram e convidam jovens.

## O que a plataforma faz

| Perfil | O que faz |
|---|---|
| **Aluno** | Compra cursos, estuda em vídeo, entrega desafios, recebe certificado, monta o portfólio e aparece no Banco de Talentos. Onboarding opcional, sem CPF |
| **Mentor** | Abre a carteira (CPF e Pix), cria cursos com vídeos por arrastar e soltar, corrige desafios, acompanha vendas e saca por Pix |
| **Empresa** | Cadastra o CNPJ e os representantes, busca talentos, convida para vagas e acompanha as respostas |
| **Admin** | Visão geral da plataforma, pedidos e reembolsos, pagamento de saques e a carteira do Hub+ |

Patrocinadores e doadores não têm login: doam ao Hub+ e recebem selo e relatório (decisão pendente, A8).

Os fluxos completos de cada perfil estão em [docs/FLOWS.md](docs/FLOWS.md).

## Estrutura

```
api/    Backend (Fastify, Drizzle, Postgres, CASL, Stripe, Cloudflare R2)
web/    Front-end (React, Vite, Tailwind v4, TanStack Query, React Router)
docs/   Plano, decisões, fluxos, API, modelo de dados e protótipo de design
```

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node 22, Fastify 5, Drizzle, Postgres 17, Zod, CASL, JWT, R2 (SDK do S3) |
| Front-end | React 19, Vite, Tailwind v4, lucide, sonner, axios, TanStack Query, React Router DOM |
| Pagamentos | Stripe (Checkout + webhook), atrás da interface `PaymentGateway` |
| Vídeos, capas e anexos | Cloudflare R2, com envio direto do navegador por URL pré-assinada |

## Pré-requisitos

- Node `>=22`
- pnpm
- Docker (para o Postgres)

## Rodando localmente

### API (porta 3340)

```bash
cd api
cp .env.example .env        # preencher JWT_SECRET e as chaves do R2
docker compose up -d        # Postgres na porta 5959
pnpm install
pnpm db:migrate
pnpm db:seed                # cria o admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
pnpm dev
```

| Comando | Para que serve |
|---|---|
| `pnpm test` | Testes de integração contra o Postgres local |
| `pnpm build` | Checagem de tipos |
| `pnpm db:generate` | Gera uma migração a partir do schema |
| `pnpm db:migrate` | Aplica as migrações |

O seed cria **só o admin**. Mentores, alunos e empresas se cadastram pela própria plataforma.

### Front-end (porta 5173)

```bash
cd web
cp .env.example .env        # VITE_API_URL=http://localhost:3340
pnpm install
pnpm dev
```

`pnpm build` no `web/` faz a checagem de tipos e gera o pacote de produção.

## Configuração

- **Pagamento em desenvolvimento:** `PAYMENT_GATEWAY=fake` (padrão) simula o pagamento por uma tela local. É proibido em produção: a API não sobe.
- **Stripe real:** `PAYMENT_GATEWAY=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, e o webhook em `POST /webhooks/stripe` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` e `charge.refunded`.
- **R2:** o bucket precisa de CORS liberando `PUT` e `GET` para a origem do front-end. Sem isso o envio de capas, vídeos e anexos falha no navegador.
- **Retenção do Hub+:** `PLATFORM_FEE_PERCENT`. O valor real ainda não foi definido.
- **Taxa do meio de pagamento:** `GATEWAY_FEE_PERCENT` (padrão 3,99) e `GATEWAY_FEE_FIXED_IN_CENTS` (padrão 39). É uma estimativa descontada do mentor e mostrada a ele ao definir o preço (D22). Confirme os valores na sua conta do Stripe.
- **Janela de garantia:** `WALLET_HOLD_DAYS` (padrão 7).
- **Saque mínimo:** `MIN_WITHDRAWAL_IN_CENTS` (padrão 5000).

## Regras de domínio

- Dinheiro sempre em centavos (inteiros).
- A carteira é calculada a partir de um ledger imutável (`ledger_entries`). O saque é uma solicitação que o admin paga por fora (sem Stripe Connect no MVP).
- Movimentações financeiras ocorrem dentro de transação do banco.
- Toda autorização passa por CASL, sem checagem de perfil direto nas rotas. A trava do mentor sem carteira e da empresa sem cadastro também está no CASL.
- CPF existe só no mentor (necessário para pagar Pix). O aluno nunca informa CPF.
- Empresas veem só o primeiro nome e a inicial do sobrenome do aluno até ele aceitar um convite.

## Design

Tema claro por padrão, escuro opcional. Painel de SaaS limpo, com o roxo `#5900B0` como única cor de ação e o laranja `#F26303` para progresso e destaques. O protótipo aprovado está em [docs/design/mockup-workspace.html](docs/design/mockup-workspace.html) e os tokens em `web/src/index.css`.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Plano, fases e situação de cada uma |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisões tomadas (D1 a D22) e pendentes (A6 a A14) |
| [docs/FLOWS.md](docs/FLOWS.md) | Fluxos de cada perfil, do cadastro ao resultado |
| [docs/API.md](docs/API.md) | Referência das rotas |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Tabelas e regras de dados |
| [docs/BACKLOG.md](docs/BACKLOG.md) | Backlog, releases, plano de sprints e riscos. Gerado de `docs/jira/` |
| [CLAUDE.md](CLAUDE.md) | Contexto do projeto para o Claude Code |

## Idioma

Interface e textos ao usuário em português do Brasil. Identificadores no código em inglês.
