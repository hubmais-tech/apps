# Deploy do Hub+

Como colocar a API e o front-end no ar. Decisões de empacotamento: `DECISIONS.md`, D26. **A hospedagem ainda não foi escolhida (N1):** tudo aqui vale para qualquer lugar que rode containers.

## O que existe

| Arquivo | Para quê |
|---|---|
| `api/Dockerfile` | Imagem da API (Node 22, usuário `node`, migrações no entrypoint, `HEALTHCHECK`) |
| `web/Dockerfile` | Imagem do front-end (nginx sem privilégios, SPA com fallback, `API_URL` lida na partida) |
| `docker-compose.yml` | Stack completa: Postgres, API e front-end |
| `.env.example` | Variáveis do compose. Copie para `.env` |
| `.github/workflows/ci.yml` | Tipos, testes da API, build do front e das duas imagens (não publica nada) |

O Postgres de desenvolvimento continua em `api/docker-compose.yml` (porta 5959) e não tem relação com o `docker-compose.yml` da raiz.

## Antes de subir

1. **Domínios com HTTPS** para o site e para a API (por exemplo `hubmais.exemplo.com` e `api.hubmais.exemplo.com`). O container não faz HTTPS: use o proxy da plataforma, o Caddy ou o Traefik na frente.
2. **Cloudflare R2:** bucket criado, chaves de acesso e **CORS liberando `PUT` e `GET` para o endereço do site**. Sem isso, o envio de capas e vídeos falha no navegador.
3. **Stripe:** chave secreta e **webhook apontando para `https://<api>/webhooks/stripe`** (eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`). O segredo do webhook (`whsec_...`) sai dessa tela.
4. **Segredos:** `JWT_SECRET` com 32 caracteres ou mais (`openssl rand -base64 48`) e uma senha forte para o Postgres.

## Opção A: servidor próprio (VPS) com Docker Compose

```bash
git clone <repositório> && cd hub.mais
cp .env.example .env          # preencher tudo
docker compose up -d --build
docker compose exec api node dist/seed.js     # cria o primeiro admin (uma vez)
```

- O site sobe na porta `WEB_PORT` (8080) e a API na `API_PORT` (3333). Aponte o proxy HTTPS para elas.
- Exemplo de proxy com Caddy (HTTPS automático):

  ```
  hubmais.exemplo.com     { reverse_proxy localhost:8080 }
  api.hubmais.exemplo.com { reverse_proxy localhost:3333 }
  ```

- `FRONTEND_URL` e `API_PUBLIC_URL` do `.env` precisam ser exatamente os endereços públicos, com `https://` e sem barra no final. O primeiro vira a origem liberada no CORS e o prefixo dos links de convite. O segundo é o que o navegador chama.
- Para **atualizar**: `git pull && docker compose up -d --build`. As migrações rodam sozinhas na partida da API.

## Opção B: plataforma de containers (Render, Railway, Fly, Coolify...)

Crie **dois serviços** a partir dos Dockerfiles e um Postgres gerenciado:

| Serviço | Contexto e Dockerfile | Porta | Verificação de saúde | Variáveis |
|---|---|---|---|---|
| API | `api/` | `PORT` (a plataforma define; a API respeita) | `GET /health/ready` | as da tabela abaixo, com `DATABASE_URL` do Postgres gerenciado |
| Front-end | `web/` | `PORT` (padrão 8080) | `GET /healthz` | `API_URL` = endereço público da API |

Use **uma réplica** da API (ver "Limites"). Defina `TRUST_PROXY=true`.

## Opção C: API no Render e front-end na Vercel

A Vercel **não usa o Dockerfile do front-end**: ela roda `pnpm build` e publica a pasta `dist` como site estático. Por isso a URL da API entra **no build** (`VITE_API_URL`), e não na partida (`API_URL`). O `web/vercel.json` cuida do fallback das rotas do React Router (sem ele, recarregar `/painel` daria 404), do cache e dos cabeçalhos de segurança.

**Ordem** (um precisa do endereço do outro):

1. **Render, banco:** crie um PostgreSQL na mesma região da API e copie a **Internal Database URL**.
2. **Render, API:** Web Service a partir do repositório, linguagem **Docker**, **Root Directory** `api`, **Dockerfile Path** `./Dockerfile`, **Health Check Path** `/health/ready`. Cadastre as variáveis da tabela abaixo. O endereço fica `https://<nome-do-serviço>.onrender.com`.
3. **Vercel:** importe o repositório, **Root Directory** `web` (o framework Vite é detectado), e crie `VITE_API_URL=https://<nome-do-serviço>.onrender.com` em Production (e Preview, se usar). Faça o deploy.
4. **Volte ao Render:** ajuste `FRONTEND_URL` para o endereço da Vercel e faça novo deploy da API.
5. **R2:** libere o endereço da Vercel no CORS do bucket (`PUT` e `GET`).
6. **Stripe:** webhook em `https://<nome-do-serviço>.onrender.com/webhooks/stripe`.

| Variável (Render) | Valor |
|---|---|
| `DATABASE_URL` | Internal Database URL do Postgres do Render (a externa exige SSL) |
| `FRONTEND_URL` | `https://seu-site.vercel.app`. Aceita vários, separados por vírgula (ex.: o domínio próprio e o `www`), sem barra no final |
| `TRUST_PROXY` | `true` (a API fica atrás do proxy do Render) |
| `JWT_SECRET` | 32 caracteres ou mais |
| `CLOUDFLARE_*` e `STRIPE_*` | como na tabela de variáveis acima. `PAYMENT_GATEWAY=stripe` |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `RUN_SEED=true` | só no primeiro deploy: cria o admin na partida (o Shell do Render não existe no plano gratuito). Depois, apague `RUN_SEED` e a senha |
| `PORT` | **não defina**: o Render injeta e a API respeita |

Atenção:

- **Previews da Vercel:** cada deploy de preview tem um endereço novo, e a API só libera o que está em `FRONTEND_URL`. O navegador bloqueia as chamadas por CORS. Para testar um preview, adicione o endereço dele ao `FRONTEND_URL`; o resto do tempo, use só o domínio de produção.
- **Mudou a URL da API?** Na Vercel isso exige **novo deploy** do front-end, porque `VITE_API_URL` é embutida no build.
- **HTTPS nos dois lados:** `VITE_API_URL` precisa começar com `https://`, senão o navegador bloqueia as chamadas (conteúdo misto).
- **Plano gratuito do Render:** a API hiberna após um período sem uso (a primeira requisição demora e o Stripe precisa repetir webhooks) e o banco gratuito é temporário. Confira os limites atuais e use planos pagos no piloto.
- **Troca de versão no Render:** por um instante a versão nova e a antiga rodam juntas. As migrações rodam na partida da nova, então escreva migrações que não quebrem a versão antiga (adicionar é seguro; apagar ou renomear coluna, não).

## Variáveis da API

| Variável | Obrigatória | O que é |
|---|---|---|
| `NODE_ENV` | não (imagem usa `production`) | Em produção, `PAYMENT_GATEWAY=fake` é recusado e a API não sobe |
| `PORT` | não | Porta da API (padrão 3333 na imagem) |
| `DATABASE_URL` | sim | `postgresql://usuario:senha@host:5432/banco` |
| `FRONTEND_URL` | sim | Endereço público do site, com `https://` e sem barra no final. Aceita vários, separados por vírgula (CORS libera todos; o primeiro vira a base dos links de convite e do retorno do Stripe) |
| `JWT_SECRET` | sim | 32 caracteres ou mais |
| `TRUST_PROXY` | recomendada | `true` atrás de proxy ou balanceador |
| `CLOUDFLARE_ENDPOINT`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_BUCKET_NAME`, `CLOUDFLARE_PUBLIC_URL` | sim | Bucket R2 |
| `PAYMENT_GATEWAY` | não (`stripe` em produção) | `stripe` ou `fake` (só desenvolvimento) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | com `stripe` | Chaves do Stripe |
| `PLATFORM_FEE_PERCENT`, `GATEWAY_FEE_PERCENT`, `GATEWAY_FEE_FIXED_IN_CENTS`, `WALLET_HOLD_DAYS`, `MIN_WITHDRAWAL_IN_CENTS` | não | Regras financeiras (padrões em `api/.env.example`; a retenção de 20% é suposição, A14) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | para o seed | Primeiro admin |
| `RUN_MIGRATIONS` | não (`true`) | `false` pula as migrações na partida |
| `RUN_SEED` | não (`false`) | `true` cria o admin inicial na partida (idempotente). Para plataformas sem terminal |

Front-end: `API_URL` (endereço público da API) e `PORT` (padrão 8080).

## Rotinas

- **Primeiro admin:** `node dist/seed.js` dentro do container da API (no Compose: `docker compose exec api node dist/seed.js`) ou `RUN_SEED=true` na partida. É idempotente: se o e-mail existe, não faz nada.
- **Migrações com várias réplicas ou fora da partida:** `RUN_MIGRATIONS=false` nos serviços e um comando único `node dist/migrate.js`.
- **Backup do Postgres** (Compose): `docker compose exec -T db pg_dump -U hubmais hubmais | gzip > backup-$(date +%F).sql.gz`. Restauração: `gunzip -c backup.sql.gz | docker compose exec -T db psql -U hubmais hubmais`. Em Postgres gerenciado, use o backup da plataforma e **teste a restauração** (item E01-S08 do backlog).
- **Logs:** `docker compose logs -f api`.
- **Rollback:** volte para o commit anterior e suba de novo. As migrações só andam para frente: antes de uma migração que apaga ou renomeia coluna, faça backup.

## Como foi verificado (2026-11-12)

Imagens construídas e stack subida com Compose em portas livres, usando `NODE_ENV=development` e gateway `fake`:

- Os três serviços ficaram saudáveis. As 5 migrações foram aplicadas e o seed criou o admin.
- Login real pelo navegador contra a stack (admin foi para `/admin`), recarga em rota profunda (`/admin/companies`) sem erro, `config.js` com a URL da API e CORS funcionando.
- `docker stop` encerrou a API em cerca de 1 s, com a mensagem "SIGTERM recebido".
- `NODE_ENV=production` com `PAYMENT_GATEWAY=fake` foi recusado.
- Tamanhos: API 335 MB, front-end 75 MB. Os dois processos rodam sem privilégios.

Também simulado o que o Render faz: API com `PORT=10000`, `NODE_ENV=production` com Stripe, `FRONTEND_URL` com barra no final e dois endereços (CORS liberou os dois e recusou um terceiro), e `RUN_SEED=true` (cria o admin e, ao reiniciar, responde "já existe"). O build "estilo Vercel" (`VITE_API_URL` no ambiente, sem Docker) embute a URL da API no pacote, e o `vercel.json` foi checado com as rotas do app (rotas do React Router caem no `index.html`; `/assets`, `/config.js` e o ícone são servidos como arquivo).

**Não verificado:** pagamento real no Stripe, envio real ao R2, HTTPS, o deploy de fato no Render e na Vercel e o workflow do GitHub Actions (precisa rodar uma vez no GitHub).

## Limites conhecidos

- **Uma réplica da API:** o rate limit guarda os contadores na memória de cada processo. Para escalar, é preciso um armazenamento compartilhado (Redis).
- **Sem política CSP:** o `index.html` tem um script inline para o tema. Entra na revisão de segurança (E03-S09).
- **Sem e-mail transacional (A11):** os links de convite são mostrados na tela.
- **Token no `localStorage`:** o login guarda o JWT no navegador, por isso a política CSP e a revisão de segurança importam antes de abrir ao público.
