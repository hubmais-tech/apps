# Hub+

Plataforma digital de formação e conexão profissional para jovens de 18 a 26 anos de Aracaju (SE) e região. Une cursos curtos (4 a 6 semanas), Banco de Talentos e relatórios de impacto social.

> Status: MVP (fases 1 a 4 do plano) em construção. Desafios, portfólio, Banco de Talentos e área da empresa ficam para as próximas fases.

## Como funciona

- **Aluno:** compra cursos, assiste às aulas e acompanha o progresso.
- **Mentor:** cria cursos com módulos e aulas, envia vídeos e capas e acompanha a carteira (saldo pendente e disponível, saque por Pix).
- **Empresa:** perfil previsto para o Banco de Talentos (fases futuras).
- **Admin:** gerencia pedidos, reembolsos e saques, e vê a carteira do Hub+ com as retenções.

Patrocinadores não têm login: empresas doam ao Hub+ e recebem selo e relatório.

## Estrutura

```
api/    Backend (Fastify, Drizzle, Postgres, CASL, Stripe, Cloudflare R2)
web/    Front-end (React, Vite, Tailwind v4, TanStack Query, React Router)
docs/   Plano, decisões e documentos de origem
```

## Stack

| Camada | Tecnologias |
| --- | --- |
| Backend | Node 22, Fastify 5, Drizzle, Postgres, Zod, CASL, JWT, R2 (SDK do S3) |
| Front-end | React, Vite, Tailwind v4, shadcn, lucide, sonner, axios, TanStack Query, React Router DOM |
| Pagamentos | Stripe (Checkout + webhook), atrás da interface `PaymentGateway` |
| Vídeos e capas | Cloudflare R2, com upload direto do navegador por URL pré-assinada |

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

Outros comandos: `pnpm test` (testes de integração contra o Postgres local) e `pnpm build` (checagem de tipos).

### Front-end (porta 5173)

```bash
cd web
cp .env.example .env        # VITE_API_URL=http://localhost:3340
pnpm install
pnpm dev
```

## Configuração

- **Pagamento em desenvolvimento:** `PAYMENT_GATEWAY=fake` (padrão) simula o pagamento por uma tela local. É proibido em produção: a API não sobe.
- **Stripe real:** defina `PAYMENT_GATEWAY=stripe`, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, e aponte o webhook para `POST /webhooks/stripe` com os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` e `charge.refunded`.
- **R2:** o bucket precisa de CORS liberando `PUT` e `GET` para a origem do front-end.
- **Retenção do Hub+:** `PLATFORM_FEE_PERCENT` (padrão 20) é uma suposição, pois o valor real ainda não foi definido.
- **Janela de garantia:** `WALLET_HOLD_DAYS` (padrão 7) define quando o saldo pendente fica disponível.

## Regras de domínio

- Dinheiro sempre em centavos (inteiros).
- A carteira é calculada a partir de um ledger imutável (`ledger_entries`). O saque é uma solicitação que o admin paga por fora (sem Stripe Connect no MVP).
- Movimentações financeiras ocorrem dentro de transação do banco.
- Toda autorização passa por CASL, sem checagem de perfil direto nas rotas.

## Design

Tema escuro por padrão. Cores principais: roxo `#5900B0`, areia `#F3CC9F` e laranja `#F26303`. Os tokens ficam em `web/src/index.css`.

## Documentação

- [docs/PLAN.md](docs/PLAN.md): plano do projeto e fases.
- [docs/DECISIONS.md](docs/DECISIONS.md): decisões e pontos em aberto.
- [CLAUDE.md](CLAUDE.md): contexto do projeto para o Claude Code.

## Idioma

Interface e textos ao usuário em português do Brasil. Identificadores no código em inglês.
