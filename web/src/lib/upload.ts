import axios from 'axios'

import { api } from './api'

export const MB = 1024 * 1024
export const GB = 1024 * MB

/** Tipos e limites aceitos (docs/DECISIONS.md, D15). A API valida de novo. */
export const uploadRules = {
  cover: { accept: ['image/jpeg', 'image/png', 'image/webp'], maxSize: 5 * MB, label: 'JPG, PNG ou WebP, até 5 MB' },
  video: { accept: ['video/mp4', 'video/webm', 'video/quicktime'], maxSize: 2 * GB, label: 'MP4, WebM ou MOV, até 2 GB' },
} as const

export function formatBytes(bytes: number) {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1).replace('.', ',')} GB`
  if (bytes >= MB) return `${(bytes / MB).toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Nome do arquivo vira título sugerido: "01_intro-ao-curso.mp4" vira "Intro ao curso". */
export function titleFromFilename(name: string) {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[\s._-]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Nova aula'
}

export function readVideoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Math.round(video.duration) || 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

/** Envia o arquivo direto ao R2 pela URL pré-assinada. O binário nunca passa pela API. */
export async function uploadCourseFile(opts: {
  courseId: string
  kind: 'cover' | 'video'
  file: File
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}) {
  const { courseId, kind, file, onProgress, signal } = opts
  const { data } = await api.post<{ uploadUrl: string; key: string }>(`/courses/${courseId}/uploads`, {
    kind,
    contentType: file.type,
    size: file.size,
  })
  await axios.put(data.uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    signal,
    onUploadProgress: (event) => onProgress?.(event.total ? (event.loaded / event.total) * 100 : 0),
  })
  return data.key
}
