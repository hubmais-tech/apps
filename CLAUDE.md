# Hub+ (Hub Juventude+)

Plataforma digital de formação e conexão profissional para jovens de 18 a 26 anos de Aracaju (SE) e região. Une cursos curtos (4 a 6 semanas), Banco de Talentos e relatórios de impacto social. Os documentos de origem estão em `docs/`: descrição da ideia, mapa de empatia e SWOT, pitch.

## Estado atual

Fases 1 a 6 do plano e o onboarding por perfil estão implementados e testados. Falta a fase 2 (planos corporativos, doações, taxa de contratação, e-mail transacional, etc.), que depende de decisões pendentes (A8 a A13). Duas decisões de 2026-11-12: a empresa tem cadastro único feito pelo Hub+ e escolhe quem gerencia a conta (D23, **implementada**: admin cadastra, responsável ativa por convite, só ele gerencia a equipe), e relatório de impacto e selos são pós-MVP (D24). Documentação em `docs/`:

- `PLAN.md`: plano e situação das fases. `DECISIONS.md`: decisões (D1 a D26) e pendências (A6 a A15).
- `FLOWS.md`: fluxo de cada perfil. `API.md`: rotas. `DATA-MODEL.md`: tabelas. `DEPLOY.md`: imagens Docker e deploy (D26).
- `BACKLOG.md`: backlog do que falta desenvolver. **É gerado:** edite `docs/jira/backlog.data.mjs` e rode `node docs/jira/build.mjs` (gera também o CSV de importação do Jira). Nunca edite o `BACKLOG.md` à mão.

**Ao mudar comportamento, rota ou tabela, atualize o documento correspondente na mesma tarefa.** Decisão nova vai em `DECISIONS.md`; o que ficar em aberto vira item "A" ali.

## Modelo de negócio (resumo)

1. Venda de cursos: o valor se divide entre o mentor (autor) e o Hub+.
2. Taxa de intermediação sobre contratações feitas pela plataforma.
3. Patrocínios e bolsas: empresas doam ao Hub+. **Patrocinadores não têm login nem perfil.** Selo e relatório de impacto para doadores são pós-MVP (D24).
4. Planos corporativos de acesso ao Banco de Talentos: Essencial, Avançado e Premium. Os selos Bronze, Prata e Ouro são pós-MVP (D24). **Empresas não se cadastram sozinhas:** o Hub+ cadastra (cadastro único por CNPJ) e a empresa escolhe quem gerencia a conta (D23).

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

- **Onboarding por perfil (D12):** aluno opcional e sem CPF; mentor obrigatório. **Empresa não tem onboarding: o Hub+ cadastra (D23).** A trava é da API: `AuthUser` carrega `walletOpened` (mentor) e `companyId` (empresa), e o CASL só concede criar curso, carteira, saque e Banco de Talentos com isso. Nunca confie só no redirecionamento do front-end.
- **CPF só no mentor** (`mentor_accounts`, D13). Respostas da API devolvem CPF e Pix mascarados. Só o admin que paga o saque vê o CPF completo.
- **Empresa só vê primeiro nome e inicial** do aluno até ele aceitar o convite (D18).
- **Certificado** só quando todas as aulas estão concluídas e todos os desafios aprovados (D16). Quem emite é `issueCertificateIfComplete` (`api/src/services/certificates.ts`).
- **Uploads** vão direto ao R2 por URL pré-assinada, com tipo e tamanho validados na API (D15).

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
- `PLATFORM_FEE_PERCENT` (padrão 20) é uma **suposição**: a retenção real do Hub+ ainda não foi definida. `GATEWAY_FEE_PERCENT` e `GATEWAY_FEE_FIXED_IN_CENTS` estimam a taxa do Stripe, descontada do mentor (D22, A14).

## Estrutura

- `api/src/auth`: CASL (perfis e permissões). `api/src/http/routes`: auth, profile, company, admin-companies, courses, learning, challenges, portfolio, talents, dashboard, checkout (+ webhook), wallet. `api/src/services`: `payment-gateway`, `wallet` (ledger e saques), `orders`, `storage` (R2), `certificates`, `access`, `onboarding`, `company-access` (convites e troca de responsável). `api/src/utils`: senha, slug, documentos (CPF, CNPJ, Pix).
- `api/tests`: `flow` (MVP), `onboarding`, `company` (cadastro pelo Hub+, convite, troca de responsável), `course-builder`, `engagement` (desafios, certificado, portfólio, talentos), `dashboard`. Os testes rodam contra o Postgres local (`pnpm test`).
- `web/src/pages`: telas por área (`onboarding`, `mentor`, `student`, `company`, `admin`), mais `landing` (página inicial pública em `/`, igual com ou sem login, D25). O painel de cada perfil fica em `/painel`. As telas autenticadas carregam sob demanda em `App.tsx`. `web/src/components/ui`: componentes no estilo shadcn. `web/src/components`: `layout` (shell por perfil), `dropzone`, `onboarding-shell`, `week-bars`. `web/src/index.css`: tokens do design system.

## Armadilhas conhecidas

- **Deploy (D26):** a API roda em produção pelo pacote do esbuild (`pnpm bundle`), não pelo `tsx`. Imagem em `api/Dockerfile`, stack em `docker-compose.yml` na raiz. O front lê a URL da API de `/config.js` (variável `API_URL` do container), não só do `VITE_API_URL`. Scripts `.sh` precisam de fim de linha LF (`.gitattributes` cuida disso). Atrás de proxy, `TRUST_PROXY=true`, senão o rate limit vê o IP do proxy.
- Ao testar a stack Docker, use portas que não colidam com as de desenvolvimento (3340, 5173, 5959).
- Alguns arquivos de teste usam fim de linha CRLF. Edições com várias linhas por script falham sem avisar: use a ferramenta de edição e confira o resultado.
- Heredoc grande no bash do Windows quebra: crie arquivos com a ferramenta de escrita.
- O servidor da API não recarrega sozinho com `tsx` sem `watch`. `pnpm dev` usa `watch`.

- Os testes (`vitest.config.ts`) forçam `PAYMENT_GATEWAY=fake` e valores fixos de taxa, para nunca falarem com o Stripe de verdade nem dependerem do `.env`.
- No Windows, rode o Vite a partir de um caminho com a letra do drive em maiúscula (`C:/...`). Com `c:/...` o Vite carrega o mesmo arquivo por dois caminhos e o React falha com "useAuth precisa estar dentro de AuthProvider".
- `signIn` precisa **buscar** a sessão (`fetchQuery`), não só invalidar: o hook de sessão está desligado até existir token, e invalidar uma consulta desligada não busca nada.

## Ferramentas instaladas

- Skill `reverse-engineer-anything` (REA) em `.claude/skills/`. Só a skill foi instalada: o servidor MCP do REA não está registrado e o Node local (22.17.0) está abaixo do exigido pelo pacote. Usar apenas em instâncias que o dono autorize, nunca para gravar escritas em sites de terceiros.
