# Front-end do Hub+ (React + Vite), servido por nginx sem privilégios.
#   docker build -t hubmais-web ./web
#   docker run -p 8080:8080 -e API_URL=https://api.exemplo.com hubmais-web
# A URL da API é lida na partida (API_URL), então a mesma imagem serve staging e produção.
# Para embutir uma URL no build (opcional): --build-arg VITE_API_URL=https://api.exemplo.com

ARG NODE_VERSION=22

# ---------- 1. Build ----------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm build

# ---------- 2. Servidor ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ENV PORT=8080
COPY --chown=nginx:nginx --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
