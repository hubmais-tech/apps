import axios from 'axios'

import { MB } from './upload'

/** Anexos de entrega de desafio (D15): imagem, PDF ou ZIP, até 25 MB. */
export const challengeUploadRules = {
  accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/zip', 'application/x-zip-compressed'],
  maxSize: 25 * MB,
  label: 'Imagem, PDF ou ZIP, até 25 MB',
} as const

/** Capa de projeto do portfólio: mesmas regras da capa de curso. */
export const portfolioCoverRules = {
  accept: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 5 * MB,
  label: 'JPG, PNG ou WebP, até 5 MB',
} as const

/** Envia o arquivo direto ao R2 pela URL pré-assinada, com progresso e cancelamento. */
export async function putToSignedUrl(opts: { uploadUrl: string; file: File; onProgress?: (percent: number) => void; signal?: AbortSignal }) {
  const { uploadUrl, file, onProgress, signal } = opts
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    signal,
    onUploadProgress: (event) => onProgress?.(event.total ? (event.loaded / event.total) * 100 : 0),
  })
}

export const isHttpUrl = (value: string) => /^https?:\/\/\S+\.\S+/i.test(value.trim())
