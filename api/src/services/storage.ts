import { randomUUID } from 'node:crypto'

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { env } from '@/env'

const r2 = new S3Client({
  region: 'auto',
  endpoint: env.CLOUDFLARE_ENDPOINT,
  credentials: {
    accessKeyId: env.CLOUDFLARE_ACCESS_KEY_ID,
    secretAccessKey: env.CLOUDFLARE_SECRET_ACCESS_KEY,
  },
})

export type UploadKind = 'cover' | 'video' | 'attachment'

/** Limites de tamanho por tipo de arquivo (docs/DECISIONS.md, D15). */
export const MAX_UPLOAD_BYTES: Record<UploadKind, number> = {
  cover: 5 * 1024 * 1024,
  video: 2 * 1024 * 1024 * 1024,
  attachment: 25 * 1024 * 1024,
}

export function isAllowedSize(kind: UploadKind, size: number) {
  return size > 0 && size <= MAX_UPLOAD_BYTES[kind]
}

const ALLOWED_TYPES: Record<UploadKind, string[]> = {
  cover: ['image/jpeg', 'image/png', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  attachment: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/zip', 'application/x-zip-compressed'],
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
}

export function isAllowedContentType(kind: UploadKind, contentType: string) {
  return ALLOWED_TYPES[kind].includes(contentType)
}

export function buildObjectKey(kind: 'cover' | 'video', courseId: string, contentType: string) {
  const folder = kind === 'cover' ? 'covers' : 'videos'
  return `courses/${courseId}/${folder}/${randomUUID()}.${EXTENSIONS[contentType]}`
}

/** URL pré-assinada para o navegador enviar o arquivo direto ao R2 (a API não recebe o binário). */
export function createUploadUrl(key: string, contentType: string, size: number) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: env.CLOUDFLARE_BUCKET_NAME, Key: key, ContentType: contentType, ContentLength: size }),
    { expiresIn: 60 * 15 },
  )
}

/** URL assinada de leitura, de curta duração, usada para o player de vídeo. */
export function createReadUrl(key: string) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: env.CLOUDFLARE_BUCKET_NAME, Key: key }), {
    expiresIn: 60 * 60 * 2,
  })
}

export function publicUrl(key: string | null) {
  if (!key) return null
  return `${env.CLOUDFLARE_PUBLIC_URL.replace(/\/$/, '')}/${key}`
}

/** Arquivo de entrega de desafio: fica na pasta do desafio e do aluno. */
export function buildAttachmentKey(challengeId: string, userId: string, contentType: string) {
  return `submissions/${challengeId}/${userId}/${randomUUID()}.${EXTENSIONS[contentType]}`
}

/** Capa de projeto do portfólio. */
export function buildPortfolioKey(userId: string, contentType: string) {
  return `portfolio/${userId}/${randomUUID()}.${EXTENSIONS[contentType]}`
}
