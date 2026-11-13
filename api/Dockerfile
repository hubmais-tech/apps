# API do Hub+ (Fastify + Drizzle + Postgres).
# Três etapas: instalar tudo, gerar o pacote (esbuild) e montar a imagem final só com o necessário.
#   docker build -t hubmais-api ./api
# Variáveis de ambiente: ver api/.env.example e docs/DEPLOY.md. Não há .env dentro da imagem.

ARG NODE_VERSION=22

# ---------- 1. Dependências (todas) ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- 2. Pacote da aplicação ----------
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
# Checa os tipos e gera dist/server.js, dist/migrate.js e dist/seed.js (dependências ficam externas).
RUN pnpm build && pnpm bundle

# ---------- 3. Dependências de produção ----------
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- 4. Imagem final ----------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3333 \
    MIGRATIONS_DIR=/app/migrations \
    RUN_MIGRATIONS=true \
    RUN_SEED=false
WORKDIR /app

# Roda sem privilégios (usuário "node" já existe na imagem oficial). --chown evita duplicar camadas.
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node src/database/migrations ./migrations
COPY --chown=node:node package.json ./
COPY --chown=node:node --chmod=755 docker-entrypoint.sh ./
USER node

EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3333) + '/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# O entrypoint aplica as migrações e depois troca o processo pelo servidor (assim o SIGTERM chega nele).
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
