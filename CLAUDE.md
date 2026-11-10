# Hub+ (Hub Juventude+)

Plataforma digital de formação e conexão profissional para jovens de 18 a 26 anos de Aracaju (SE) e região. Une cursos curtos (4 a 6 semanas), Banco de Talentos e relatórios de impacto social. Os documentos de origem estão em `docs/`: descrição da ideia, mapa de empatia e SWOT, pitch.

## Estado atual

MVP (fases 1 a 4 do plano) em construção. O plano está em `docs/PLAN.md` e as decisões em `docs/DECISIONS.md`. Código em `api/` e `web/`.

## Modelo de negócio (resumo)

1. Venda de cursos: o valor se divide entre o mentor (autor) e o Hub+.
2. Taxa de intermediação sobre contratações feitas pela plataforma.
3. Patrocínios e bolsas: empresas doam ao Hub+ e recebem selo e relatório. **Patrocinadores não têm login nem perfil.**
4. Planos corporativos de acesso ao Banco de Talentos: Essencial, Avançado e Premium, com selos Bronze, Prata e Ouro.

## Perfis (CASL)

`student`, `mentor`, `company`, `admin`. Não existe `sponsor`.

## Stack

- **Backend (`api/`):** Node, Fastify 5, Drizzle, Postgres, Zod, CASL, JWT, Cloudflare R2 (SDK do S3).
- **Front-end (`web/`):** React, Vite, Tailwind v4, shadcn, lucide, sonner, axios, TanStack Query. React Router DOM.
- **Pagamentos:** Stripe (Checkout + webhook), atrás da interface `PaymentGateway`. Sem Connect no MVP: saque do mentor é solicitação que o admin paga por fora. Ver `docs/DECISIONS.md`, D4.
- **Vídeos:** bucket R2 com URL pré-assinada.

## Referências de estrutura

- `hubmais-tech/api` no GitHub: base da estrutura do backend (`src/auth`, `database/schema`, `http/routes/<módulo>`, `services`, `utils`, `env.ts`).
- `rocketseat-education/course-saas-next-rbac`: padrão de permissões e rotas com CASL.
- Pontos do `hubmais-tech/api` que NÃO devem ser copiados: CPF obrigatório no cadastro de aluno, slug de aula único globalmente, upload multipart de vídeo pela API, saldo da carteira como campo editável.

## Regras de domínio

- **Dinheiro sempre em centavos** (inteiros). Nunca ponto flutuante.
- **Carteira estilo Kiwify:** saldo calculado a partir de um ledger imutável (`ledger_entries`), com saldo pendente e disponível, e saque por Pix. A carteira do Hub+ segue o mesmo modelo no perfil admin. O admin vê as retenções do Hub+ como o mentor vê os dele. Janela de garantia de 7 dias (`WALLET_HOLD_DAYS`).
- Movimentações financeiras sempre dentro de transação do banco.
- Toda autorização passa por CASL. Nenhuma rota checa o perfil na mão.

## Design

- Cores principais: roxo `#5900B0`, areia `#F3CC9F`, laranja `#F26303`.
- **Tema claro como padrão**, escuro opcional. Direção "Hub+ Workspace" (`docs/DECISIONS.md`, D11): painel de SaaS limpo, sidebar de 256 px, cards brancos com borda de 1 px, roxo como única cor de ação, laranja só para progresso e destaques, tipografia neutra sem fonte de display, botões retangulares com raio de 8 px. Nada de hero em gradiente nem botões em pílula.
- Protótipo aprovado fica em `docs/design/`. Mudanças grandes de layout passam por protótipo antes do código.
- Logo: `docs/images/logo-hubmais-instagram.jpg` (150x150, baixa resolução). Falta o original em alta resolução ou SVG.

## Convenções

- Idioma da interface e dos textos ao usuário: português do Brasil.
- Idioma dos identificadores no código: inglês.
- Gerenciador de pacotes: pnpm.

## Como rodar

Requer Node `>=22` e pnpm. Docker para o Postgres.

```bash
# API (porta 3340, não 3333, para não colidir com outros projetos locais)
cd api
cp .env.example .env        # preencher JWT_SECRET e as chaves do R2
docker compose up -d        # Postgres na porta 5959 (projeto "hubmais")
pnpm install
pnpm db:migrate
pnpm db:seed                # cria o admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
pnpm dev
pnpm test                   # testes de integração contra o Postgres local
pnpm build                  # checagem de tipos

# Front-end (porta 5173)
cd web
cp .env.example .env        # VITE_API_URL=http://localhost:3340
pnpm install
pnpm dev
```

- `PAYMENT_GATEWAY=fake` (padrão em desenvolvimento) simula o pagamento por uma tela local. Proibido em produção (a API não sobe).
- Para o Stripe real: `PAYMENT_GATEWAY=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, e apontar o webhook para `POST /webhooks/stripe` (eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`).
- O upload de capa e vídeo vai direto do navegador ao R2. O bucket precisa de CORS liberando `PUT` e `GET` para a origem do front-end.
- `PLATFORM_FEE_PERCENT` (padrão 20) é uma **suposição**: a retenção real do Hub+ ainda não foi definida.

## Estrutura

- `api/src/auth`: CASL (perfis e permissões). `api/src/services`: `payment-gateway` (interface + Stripe + fake), `wallet` (ledger, saques), `orders` (pagamento, reembolso), `storage` (R2).
- `api/src/http/routes`: auth, courses, learning, checkout (+webhook), wallet.
- `web/src/pages`: telas. `web/src/components/ui`: componentes no estilo shadcn. `web/src/index.css`: tokens do design system.

## Ferramentas instaladas

- Skill `reverse-engineer-anything` (REA) em `.claude/skills/`. Só a skill foi instalada: o servidor MCP do REA não está registrado e o Node local (22.17.0) está abaixo do exigido pelo pacote. Usar apenas em instâncias que o dono autorize, nunca para gravar escritas em sites de terceiros.
