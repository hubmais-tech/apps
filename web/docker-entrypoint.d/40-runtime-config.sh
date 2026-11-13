#!/bin/sh
# Escreve /config.js com a URL da API na partida do container.
# Assim a mesma imagem serve staging e produção: só muda a variável API_URL.
set -e

CONFIG=/usr/share/nginx/html/config.js

if [ -z "${API_URL}" ]; then
  echo "AVISO: API_URL não definida. O front-end vai usar a URL embutida no build (VITE_API_URL) ou localhost." >&2
  exit 0
fi

# Escapa aspas e barras invertidas para o valor ficar seguro dentro do JavaScript.
ESCAPED=$(printf '%s' "${API_URL}" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.__HUBMAIS__ = { API_URL: "%s" }\n' "${ESCAPED}" > "${CONFIG}"
echo "config.js gerado com API_URL=${API_URL}"
