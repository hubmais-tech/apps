import { randomBytes } from 'node:crypto'

export function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Slug com sufixo aleatório curto, para evitar colisão sem consultar o banco. */
export function uniqueSlug(text: string) {
  const base = slugify(text) || 'curso'
  return `${base.slice(0, 60)}-${randomBytes(3).toString('hex')}`
}
