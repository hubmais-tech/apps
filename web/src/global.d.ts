/** Configuração em tempo de execução, escrita em /config.js (ver web/docker-entrypoint.d). */
interface Window {
  __HUBMAIS__?: { API_URL?: string }
}
