#!/bin/sh
# Aplica as migrações pendentes e sobe o servidor.
# RUN_MIGRATIONS=false pula as migrações (útil com várias réplicas: rode `node dist/migrate.js` uma vez, à parte).
# RUN_SEED=true cria o primeiro admin na partida (SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD). É idempotente.
# Serve para plataformas sem terminal (ex.: Render gratuito). Depois do primeiro deploy, volte para false.
set -e

if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "Aplicando migrações..."
  node dist/migrate.js
fi

if [ "${RUN_SEED}" = "true" ]; then
  echo "Criando o admin inicial..."
  node dist/seed.js
fi

exec "$@"
