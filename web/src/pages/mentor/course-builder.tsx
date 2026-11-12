import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowDown, ArrowUp, Check, CheckCircle2, ExternalLink, FileText, GripVertical, ImageIcon, Info, LayoutList, Pencil, Plus, Rocket, Target, Trash2, Video, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { CourseCard } from '@/components/course-card'
import { Dropzone } from '@/components/dropzone'
import { EarningsPreview } from '@/components/earnings-preview'
import { ErrorState, Loading } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { api, getErrorMessage, type StructureModule } from '@/lib/api'
import { formatBytes, readVideoDuration, titleFromFilename, uploadCourseFile, uploadRules } from '@/lib/upload'
import { cn, formatCurrency, formatDuration } from '@/lib/utils'

type EditData = {
  course: {
    id: string
    slug: string
    title: string
    description: string | null
    coverUrl: string | null
    coverKey: string | null
    priceInCents: number
    isPublished: boolean
  }
  modules: StructureModule[]
}

type Step = 'info' | 'cover' | 'content' | 'challenges' | 'publish'

type ChallengeItem = { id: string; title: string; brief: string; criteria: string | null; submissionsCount: number; pendingCount: number }

const parsePrice = (value: string) => Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100)
const priceInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

// ---------- Reordenação (funções puras) ----------
type Order = { id: string; lessonIds: string[] }[]

const toOrder = (modules: StructureModule[]): Order => modules.map((m) => ({ id: m.id, lessonIds: m.lessons.map((l) => l.id) }))

function moveModule(order: Order, id: string, beforeId: string | null): Order {
  const moving = order.find((m) => m.id === id)
  if (!moving || id === beforeId) return order
  const rest = order.filter((m) => m.id !== id)
  const index = beforeId ? rest.findIndex((m) => m.id === beforeId) : rest.length
  rest.splice(index < 0 ? rest.length : index, 0, moving)
  return rest
}

function moveLesson(order: Order, lessonId: string, toModuleId: string, beforeLessonId: string | null): Order {
  if (lessonId === beforeLessonId) return order
  const cleaned = order.map((m) => ({ ...m, lessonIds: m.lessonIds.filter((id) => id !== lessonId) }))
  return cleaned.map((m) => {
    if (m.id !== toModuleId) return m
    const index = beforeLessonId ? m.lessonIds.indexOf(beforeLessonId) : -1
    const next = [...m.lessonIds]
    next.splice(index < 0 ? next.length : index, 0, lessonId)
    return { ...m, lessonIds: next }
  })
}

function applyOrder(modules: StructureModule[], order: Order): StructureModule[] {
  const lessonById = new Map(modules.flatMap((m) => m.lessons.map((l) => [l.id, l] as const)))
  const moduleById = new Map(modules.map((m) => [m.id, m] as const))
  return order.map((entry, index) => ({
    ...moduleById.get(entry.id)!,
    position: index + 1,
    lessons: entry.lessonIds.map((id, i) => ({ ...lessonById.get(id)!, position: i + 1 })),
  }))
}

// ---------- Passo 1: informações ----------
function InfoStep({ course, onSaved }: { course: EditData['course']; onSaved: () => void }) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const [price, setPrice] = useState(priceInput(course.priceInCents))
  const cents = parsePrice(price)
  const dirty = title !== course.title || description !== (course.description ?? '') || cents !== course.priceInCents
  const priceError = Number.isNaN(cents) || cents < 500

  const save = useMutation({
    mutationFn: () => api.patch(`/courses/${course.id}`, { title: title.trim(), description: description.trim() || null, priceInCents: cents }),
    onSuccess: () => {
      toast.success('Informações salvas.')
      onSaved()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!priceError) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Título do curso" htmlFor="b-title" hint="Seja direto. Ex.: Social media na prática.">
        <Input id="b-title" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Descrição" htmlFor="b-desc" hint={`${description.length} caracteres. Diga o que o aluno vai aprender e fazer.`}>
        <Textarea id="b-desc" className="min-h-36" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Preço (R$)" htmlFor="b-price" hint="Mínimo de R$ 5,00. Veja abaixo quanto fica com você.">
        <Input id="b-price" inputMode="decimal" required className="max-w-48" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={priceError} />
        {priceError && <p className="text-xs text-destructive">O preço mínimo é R$ 5,00.</p>}
      </Field>
      <EarningsPreview priceInCents={cents} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" loading={save.isPending} disabled={!dirty || priceError}>
          {dirty ? 'Salvar informações' : 'Salvo'}
        </Button>
      </div>
    </form>
  )
}

// ---------- Passo 2: capa ----------
function CoverStep({ course, onSaved }: { course: EditData['course']; onSaved: () => void }) {
  const [progress, setProgress] = useState<number | null>(null)

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const key = await uploadCourseFile({ courseId: course.id, kind: 'cover', file, onProgress: setProgress })
      await api.patch(`/courses/${course.id}`, { coverKey: key })
    },
    onSuccess: () => {
      toast.success('Capa atualizada.')
      onSaved()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Falha no envio da capa. Verifique o CORS do bucket do R2.')),
    onSettled: () => setProgress(null),
  })

  const remove = useMutation({
    mutationFn: () => api.patch(`/courses/${course.id}`, { coverKey: null }),
    onSuccess: onSaved,
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <Dropzone
            accept={uploadRules.cover.accept}
            maxSize={uploadRules.cover.maxSize}
            disabled={upload.isPending}
            title={course.coverUrl ? 'Arraste uma nova capa ou clique para trocar' : 'Arraste a capa aqui ou clique para escolher'}
            hint={`${uploadRules.cover.label}. Proporção 16:9.`}
            icon={<ImageIcon className="size-5" />}
            onFiles={([file]) => file && upload.mutate(file)}
            onReject={(problems) => problems.forEach((p) => toast.error(p))}
          />
          {progress !== null && (
            <div className="space-y-1.5">
              <Progress value={progress} tone="primary" />
              <p className="text-xs text-muted-foreground tabular">Enviando… {Math.round(progress)}%</p>
            </div>
          )}
          {course.coverUrl && (
            <Button type="button" variant="ghost" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}>
              <Trash2 /> Remover capa
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Como aparece no catálogo</p>
          <CourseCard course={{ id: course.id, slug: course.slug, title: course.title, description: course.description, coverUrl: course.coverUrl, priceInCents: course.priceInCents, mentorName: 'Você' }} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Sem capa, o curso usa uma ilustração gerada. Uma capa própria aumenta as chances de clique.</p>
    </div>
  )
}

// ---------- Passo 3: conteúdo ----------
type UploadItem = { id: string; name: string; size: number; progress: number; status: 'uploading' | 'saving' | 'error'; error?: string }

function InlineTitle({ value, onSave, label }: { value: string; onSave: (title: string) => void; label: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    const next = draft.trim()
    setEditing(false)
    if (next.length >= 2 && next !== value) onSave(next)
    else setDraft(value)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value)
          setEditing(true)
        }}
        className="group/title flex min-w-0 items-center gap-1.5 rounded-md text-left hover:text-primary"
        aria-label={`Renomear ${label}: ${value}`}
      >
        <span className="truncate">{value}</span>
        <Pencil className="size-3 shrink-0 opacity-0 transition-opacity group-hover/title:opacity-60 group-focus-visible/title:opacity-60" />
      </button>
    )
  }
  return (
    <input
      autoFocus
      aria-label={`Novo nome de ${label}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
      className="h-8 min-w-0 flex-1 rounded-md border border-ring bg-surface px-2 text-sm font-semibold outline-none ring-2 ring-ring/25"
    />
  )
}

type DragState = { type: 'lesson'; id: string } | { type: 'module'; id: string } | null

function ContentStep({ data, onChanged }: { data: EditData; onChanged: () => void }) {
  const queryClient = useQueryClient()
  const courseId = data.course.id
  const [moduleTitle, setModuleTitle] = useState('')
  const [uploads, setUploads] = useState<Record<string, UploadItem[]>>({})
  const drag = useRef<DragState>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const active = useRef(0)
  const waiting = useRef<(() => void)[]>([])

  const queryKey = ['course-edit', courseId]
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  const addModule = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/modules`, { title: moduleTitle.trim() }),
    onSuccess: () => {
      setModuleTitle('')
      onChanged()
    },
    onError,
  })
  const renameModule = useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => api.patch(`/modules/${id}`, { title }), onSuccess: onChanged, onError })
  const removeModule = useMutation({ mutationFn: (id: string) => api.delete(`/modules/${id}`), onSuccess: onChanged, onError })
  const renameLesson = useMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => api.patch(`/lessons/${id}`, { title }), onSuccess: onChanged, onError })
  const removeLesson = useMutation({ mutationFn: (id: string) => api.delete(`/lessons/${id}`), onSuccess: onChanged, onError })

  const reorder = useMutation({
    mutationFn: (order: Order) => api.put(`/courses/${courseId}/order`, { modules: order }),
    onMutate: async (order) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<EditData>(queryKey)
      if (previous) queryClient.setQueryData<EditData>(queryKey, { ...previous, modules: applyOrder(previous.modules, order) })
      return { previous }
    },
    onError: (error, _order, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      toast.error(getErrorMessage(error))
    },
    onSettled: onChanged,
  })

  const order = toOrder(data.modules)

  // Fila de envio: no máximo 2 vídeos ao mesmo tempo.
  async function withSlot<T>(job: () => Promise<T>) {
    if (active.current >= 2) await new Promise<void>((resolve) => waiting.current.push(resolve))
    active.current += 1
    try {
      return await job()
    } finally {
      active.current -= 1
      waiting.current.shift()?.()
    }
  }

  const patchUpload = (moduleId: string, id: string, patch: Partial<UploadItem> | null) =>
    setUploads((current) => ({
      ...current,
      [moduleId]: (current[moduleId] ?? []).flatMap((item) => (item.id !== id ? [item] : patch ? [{ ...item, ...patch }] : [])),
    }))

  /** Um arquivo vira uma aula nova (título sugerido pelo nome) ou o vídeo de uma aula existente. */
  async function sendVideo(moduleId: string, file: File, existingLessonId?: string) {
    const id = crypto.randomUUID()
    setUploads((current) => ({ ...current, [moduleId]: [...(current[moduleId] ?? []), { id, name: file.name, size: file.size, progress: 0, status: 'uploading' }] }))
    try {
      const [duration, key] = await withSlot(async () => {
        const duration = await readVideoDuration(file)
        const key = await uploadCourseFile({ courseId, kind: 'video', file, onProgress: (p) => patchUpload(moduleId, id, { progress: p }) })
        return [duration, key] as const
      })
      patchUpload(moduleId, id, { status: 'saving', progress: 100 })
      if (existingLessonId) await api.patch(`/lessons/${existingLessonId}`, { videoKey: key, durationInSeconds: duration })
      else await api.post(`/modules/${moduleId}/lessons`, { title: titleFromFilename(file.name), videoKey: key, durationInSeconds: duration })
      patchUpload(moduleId, id, null)
      onChanged()
    } catch (error) {
      patchUpload(moduleId, id, { status: 'error', error: getErrorMessage(error, 'Falha no envio. Verifique o CORS do bucket do R2.') })
    }
  }

  function onDropLesson(moduleId: string, beforeLessonId: string | null) {
    const dragging = drag.current
    setDropTarget(null)
    drag.current = null
    if (dragging?.type === 'lesson') reorder.mutate(moveLesson(order, dragging.id, moduleId, beforeLessonId))
    else if (dragging?.type === 'module' && beforeLessonId === null) reorder.mutate(moveModule(order, dragging.id, moduleId === dragging.id ? null : moduleId))
  }

  const moveLessonBy = (moduleId: string, lessonId: string, delta: -1 | 1) => {
    const lessons = order.find((m) => m.id === moduleId)!.lessonIds
    const index = lessons.indexOf(lessonId)
    const target = lessons[index + delta]
    if (!target) return
    reorder.mutate(delta === -1 ? moveLesson(order, lessonId, moduleId, target) : moveLesson(order, lessonId, moduleId, lessons[index + 2] ?? null))
  }

  const moveModuleBy = (moduleId: string, delta: -1 | 1) => {
    const index = order.findIndex((m) => m.id === moduleId)
    const target = order[index + delta]
    if (!target) return
    reorder.mutate(delta === -1 ? moveModule(order, moduleId, target.id) : moveModule(order, moduleId, order[index + 2]?.id ?? null))
  }

  return (
    <div className="space-y-4">
      {data.modules.length === 0 && (
        <div className="rounded-xl border border-dashed border-input bg-faint p-6 text-center">
          <span className="mx-auto mb-2 grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
            <LayoutList className="size-5" />
          </span>
          <p className="font-semibold">Comece criando o primeiro módulo</p>
          <p className="text-[13px] text-muted-foreground">Módulos agrupam as aulas por tema. Depois arraste os vídeos para dentro de cada um.</p>
        </div>
      )}

      {data.modules.map((mod, moduleIndex) => {
        const queue = uploads[mod.id] ?? []
        return (
          <section
            key={mod.id}
            aria-label={`Módulo ${mod.title}`}
            draggable
            onDragStart={(e) => {
              if ((e.target as HTMLElement).closest('[data-lesson]')) return
              drag.current = { type: 'module', id: mod.id }
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              drag.current = null
              setDropTarget(null)
            }}
            onDragOver={(e) => {
              if (drag.current) {
                e.preventDefault()
                setDropTarget(`module:${mod.id}`)
              }
            }}
            onDrop={(e) => {
              if (drag.current?.type === 'module') {
                e.preventDefault()
                onDropLesson(mod.id, null)
              }
            }}
            className={cn('rounded-xl border border-border bg-card transition-colors', dropTarget === `module:${mod.id}` && drag.current?.type === 'module' && 'border-primary')}
          >
            <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">{moduleIndex + 1}</span>
              <div className="min-w-0 flex-1 text-sm font-bold">
                <InlineTitle label="módulo" value={mod.title} onSave={(title) => renameModule.mutate({ id: mod.id, title })} />
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {mod.lessons.length} {mod.lessons.length === 1 ? 'aula' : 'aulas'}
              </span>
              <Button variant="ghost" size="icon" className="size-8" disabled={moduleIndex === 0} aria-label={`Subir módulo ${mod.title}`} onClick={() => moveModuleBy(mod.id, -1)}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" disabled={moduleIndex === data.modules.length - 1} aria-label={`Descer módulo ${mod.title}`} onClick={() => moveModuleBy(mod.id, 1)}>
                <ArrowDown />
              </Button>
              <ConfirmDelete label={`módulo ${mod.title}`} onConfirm={() => removeModule.mutate(mod.id)} />
            </header>

            <ul
              onDragOver={(e) => {
                if (drag.current?.type === 'lesson') {
                  e.preventDefault()
                  setDropTarget(`end:${mod.id}`)
                }
              }}
              onDrop={(e) => {
                if (drag.current?.type === 'lesson') {
                  e.preventDefault()
                  e.stopPropagation()
                  onDropLesson(mod.id, null)
                }
              }}
              className="divide-y divide-border"
            >
              {mod.lessons.map((lesson, lessonIndex) => (
                <li
                  key={lesson.id}
                  data-lesson
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation()
                    drag.current = { type: 'lesson', id: lesson.id }
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragEnd={() => {
                    drag.current = null
                    setDropTarget(null)
                  }}
                  onDragOver={(e) => {
                    if (drag.current?.type === 'lesson') {
                      e.preventDefault()
                      e.stopPropagation()
                      setDropTarget(`lesson:${lesson.id}`)
                    }
                  }}
                  onDrop={(e) => {
                    if (drag.current?.type === 'lesson') {
                      e.preventDefault()
                      e.stopPropagation()
                      onDropLesson(mod.id, lesson.id)
                    }
                  }}
                  className={cn('flex flex-wrap items-center gap-2 px-3 py-2.5 text-[13px]', dropTarget === `lesson:${lesson.id}` && 'bg-primary-soft')}
                >
                  <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                  <span className="grid size-5 shrink-0 place-items-center text-xs text-muted-foreground tabular">{lessonIndex + 1}</span>
                  <div className="min-w-0 flex-1 font-medium">
                    <InlineTitle label="aula" value={lesson.title} onSave={(title) => renameLesson.mutate({ id: lesson.id, title })} />
                  </div>
                  {lesson.hasVideo ? (
                    <Badge variant="success">
                      <Video className="size-3" /> <span className="tabular">{formatDuration(lesson.durationInSeconds)}</span>
                    </Badge>
                  ) : (
                    <label className="inline-flex h-[22px] cursor-pointer items-center gap-1 rounded-full bg-sand-soft px-2 text-[11px] font-semibold text-warning has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring">
                      <AlertCircle className="size-3" /> Sem vídeo, enviar
                      <input
                        type="file"
                        className="sr-only"
                        accept={uploadRules.video.accept.join(',')}
                        aria-label={`Enviar vídeo da aula ${lesson.title}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          if (!uploadRules.video.accept.some((t) => t === file.type)) return toast.error(`${file.name}: formato não aceito.`)
                          if (file.size > uploadRules.video.maxSize) return toast.error(`${file.name}: acima do limite de ${formatBytes(uploadRules.video.maxSize)}.`)
                          void sendVideo(mod.id, file, lesson.id)
                        }}
                      />
                    </label>
                  )}
                  <Button variant="ghost" size="icon" className="size-7" disabled={lessonIndex === 0} aria-label={`Subir aula ${lesson.title}`} onClick={() => moveLessonBy(mod.id, lesson.id, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" disabled={lessonIndex === mod.lessons.length - 1} aria-label={`Descer aula ${lesson.title}`} onClick={() => moveLessonBy(mod.id, lesson.id, 1)}>
                    <ArrowDown />
                  </Button>
                  <ConfirmDelete label={`aula ${lesson.title}`} small onConfirm={() => removeLesson.mutate(lesson.id)} />
                </li>
              ))}

              {queue.map((item) => (
                <li key={item.id} className="space-y-1.5 bg-faint px-3 py-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.size)}</span>
                    </span>
                    {item.status === 'error' ? (
                      <button type="button" aria-label={`Descartar ${item.name}`} className="text-muted-foreground hover:text-foreground" onClick={() => patchUpload(mod.id, item.id, null)}>
                        <X className="size-4" />
                      </button>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground tabular">{item.status === 'saving' ? 'Salvando…' : `${Math.round(item.progress)}%`}</span>
                    )}
                  </div>
                  {item.status === 'error' ? <p className="text-xs text-destructive">{item.error}</p> : <Progress value={item.progress} tone="primary" />}
                </li>
              ))}
            </ul>

            <div className="border-t border-border p-3">
              <Dropzone
                compact
                multiple
                accept={uploadRules.video.accept}
                maxSize={uploadRules.video.maxSize}
                title="Arraste os vídeos aqui ou clique para escolher"
                hint={`Cada vídeo vira uma aula. ${uploadRules.video.label}.`}
                icon={<Video className="size-4" />}
                onFiles={(files) => files.forEach((file) => void sendVideo(mod.id, file))}
                onReject={(problems) => problems.forEach((p) => toast.error(p))}
              />
            </div>
          </section>
        )
      })}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          addModule.mutate()
        }}
        className="flex gap-2"
      >
        <Input aria-label="Título do novo módulo" placeholder="Nome do novo módulo. Ex.: Fundamentos" required minLength={2} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
        <Button type="submit" variant="secondary" loading={addModule.isPending}>
          <Plus /> Módulo
        </Button>
      </form>
    </div>
  )
}

/** Remoção em dois cliques, sem diálogo do navegador. */
function ConfirmDelete({ label, onConfirm, small = false }: { label: string; onConfirm: () => void; small?: boolean }) {
  const [asking, setAsking] = useState(false)
  if (asking) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
          Remover
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(false)}>
          Cancelar
        </Button>
      </span>
    )
  }
  return (
    <Button type="button" variant="ghost" size="icon" className={cn('text-muted-foreground hover:text-destructive', small ? 'size-7' : 'size-8')} aria-label={`Remover ${label}`} onClick={() => setAsking(true)}>
      <Trash2 />
    </Button>
  )
}

// ---------- Passo 4: desafios ----------
type ChallengeValue = { title: string; brief: string; criteria: string }

function ChallengeForm({ initial, submitLabel, loading, onSubmit, onCancel }: { initial?: ChallengeValue; submitLabel: string; loading: boolean; onSubmit: (value: ChallengeValue) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [brief, setBrief] = useState(initial?.brief ?? '')
  const [criteria, setCriteria] = useState(initial?.criteria ?? '')
  const id = useRef(Math.random().toString(36).slice(2)).current

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({ title: title.trim(), brief: brief.trim(), criteria: criteria.trim() })
      }}
      className="space-y-4 rounded-xl border border-border bg-faint p-4"
    >
      <Field label="Título do desafio" htmlFor={'ch-title-' + id} hint="Ex.: Monte o calendário editorial de uma semana.">
        <Input id={'ch-title-' + id} required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="O que o aluno precisa fazer" htmlFor={'ch-brief-' + id} hint="Explique o resultado esperado e como entregar (texto, links, arquivos).">
        <Textarea id={'ch-brief-' + id} required minLength={10} maxLength={3000} value={brief} onChange={(e) => setBrief(e.target.value)} />
      </Field>
      <Field label="Critérios de correção (opcional)" htmlFor={'ch-criteria-' + id} hint="O que você vai olhar para aprovar. Deixa a correção mais justa e rápida.">
        <Textarea id={'ch-criteria-' + id} className="min-h-20" maxLength={1500} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function ChallengesStep({ courseId, challenges, onChanged }: { courseId: string; challenges: ChallengeItem[]; onChanged: () => void }) {
  const [adding, setAdding] = useState(challenges.length === 0)
  const [editing, setEditing] = useState<string | null>(null)
  const onError = (error: unknown) => toast.error(getErrorMessage(error))
  const body = (v: ChallengeValue) => ({ title: v.title, brief: v.brief, criteria: v.criteria || null })

  const create = useMutation({
    mutationFn: (v: ChallengeValue) => api.post('/courses/' + courseId + '/challenges', body(v)),
    onSuccess: () => {
      toast.success('Desafio criado.')
      setAdding(false)
      onChanged()
    },
    onError,
  })
  const update = useMutation({
    mutationFn: ({ id, v }: { id: string; v: ChallengeValue }) => api.patch('/challenges/' + id, body(v)),
    onSuccess: () => {
      toast.success('Desafio atualizado.')
      setEditing(null)
      onChanged()
    },
    onError,
  })
  const remove = useMutation({ mutationFn: (id: string) => api.delete('/challenges/' + id), onSuccess: onChanged, onError })

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg bg-primary-soft p-3.5 text-[13px]">
        <Target className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Desafios são tarefas práticas que o aluno entrega para você corrigir. Quando você aprova, o projeto entra no portfólio do aluno como <b className="font-semibold">validado</b>, o que abre as portas do Banco de Talentos. O certificado só sai depois que o aluno conclui as aulas e tem todos os desafios aprovados.
        </p>
      </div>

      {challenges.map((challenge, index) =>
        editing === challenge.id ? (
          <ChallengeForm key={challenge.id} initial={{ title: challenge.title, brief: challenge.brief, criteria: challenge.criteria ?? '' }} submitLabel="Salvar desafio" loading={update.isPending} onSubmit={(v) => update.mutate({ id: challenge.id, v })} onCancel={() => setEditing(null)} />
        ) : (
          <article key={challenge.id} className="rounded-xl border border-border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-3.5 py-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-orange-soft text-xs font-bold text-orange">{index + 1}</span>
              <h3 className="min-w-0 flex-1 text-sm font-bold">{challenge.title}</h3>
              {challenge.pendingCount > 0 && <Badge variant="accent">{challenge.pendingCount} para corrigir</Badge>}
              <Badge>
                {challenge.submissionsCount} {challenge.submissionsCount === 1 ? 'entrega' : 'entregas'}
              </Badge>
              <Button variant="ghost" size="icon" className="size-8" aria-label={'Editar desafio ' + challenge.title} onClick={() => setEditing(challenge.id)}>
                <Pencil />
              </Button>
              {challenge.submissionsCount === 0 && <ConfirmDelete label={'desafio ' + challenge.title} onConfirm={() => remove.mutate(challenge.id)} />}
            </header>
            <div className="space-y-2 p-3.5 text-[13px]">
              <p className="whitespace-pre-line text-muted-foreground">{challenge.brief}</p>
              {challenge.criteria && (
                <p className="rounded-md bg-faint p-2.5 text-xs">
                  <b className="font-semibold">Critérios:</b> {challenge.criteria}
                </p>
              )}
            </div>
          </article>
        ),
      )}

      {adding ? (
        <ChallengeForm submitLabel="Criar desafio" loading={create.isPending} onSubmit={(v) => create.mutate(v)} onCancel={challenges.length ? () => setAdding(false) : undefined} />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus /> Novo desafio
        </Button>
      )}
    </div>
  )
}

// ---------- Passo 5: publicar ----------
function PublishStep({ data, challengesCount, onChanged, goTo }: { data: EditData; challengesCount: number; onChanged: () => void; goTo: (step: Step) => void }) {
  const { course, modules } = data
  const lessons = modules.flatMap((m) => m.lessons)
  const withVideo = lessons.filter((l) => l.hasVideo)

  const checks: { label: string; ok: boolean; required: boolean; step: Step; help: string }[] = [
    { label: 'Título e preço definidos', ok: course.title.length >= 3 && course.priceInCents >= 500, required: true, step: 'info', help: 'Revise o título e o preço.' },
    { label: 'Pelo menos uma aula com vídeo', ok: withVideo.length > 0, required: true, step: 'content', help: 'Sem isso o curso não pode ser publicado.' },
    { label: 'Descrição com pelo menos 40 caracteres', ok: (course.description ?? '').trim().length >= 40, required: false, step: 'info', help: 'Descrições melhores vendem mais.' },
    { label: 'Capa enviada', ok: Boolean(course.coverUrl), required: false, step: 'cover', help: 'Sem capa, usamos uma ilustração gerada.' },
    { label: 'Pelo menos um desafio prático', ok: challengesCount > 0, required: false, step: 'challenges', help: 'Sem desafio, o aluno não consegue um projeto validado para o portfólio nem para o Banco de Talentos.' },
    { label: 'Todas as aulas têm vídeo', ok: lessons.length > 0 && withVideo.length === lessons.length, required: false, step: 'content', help: 'Aulas sem vídeo aparecem para o aluno, mas não abrem.' },
  ]
  const blocked = checks.some((c) => c.required && !c.ok)

  const publish = useMutation({
    mutationFn: (published: boolean) => api.post(`/courses/${course.id}/publish`, { published }),
    onSuccess: (_d, published) => {
      toast.success(published ? 'Curso publicado! Já aparece no catálogo.' : 'Curso despublicado.')
      onChanged()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-3 px-3.5 py-3">
            {check.ok ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <AlertCircle className={cn('size-5 shrink-0', check.required ? 'text-destructive' : 'text-warning')} />}
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block text-[13px] font-semibold">
                {check.label} {!check.required && !check.ok && <span className="font-normal text-muted-foreground">(recomendado)</span>}
              </b>
              {!check.ok && <span className="text-xs text-muted-foreground">{check.help}</span>}
            </span>
            {!check.ok && (
              <Button type="button" variant="secondary" size="sm" onClick={() => goTo(check.step)}>
                Ajustar
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-faint p-4">
        <div className="text-[13px]">
          <p className="font-semibold">{course.isPublished ? 'Seu curso está no ar.' : 'Pronto para publicar?'}</p>
          <p className="text-muted-foreground">
            {course.isPublished ? `Alunos podem comprar por ${formatCurrency(course.priceInCents)}.` : blocked ? 'Resolva os itens obrigatórios acima.' : 'Depois de publicado, o curso aparece no catálogo.'}
          </p>
        </div>
        <div className="flex gap-2">
          {course.isPublished && (
            <Button variant="secondary" asChild>
              <Link to={`/courses/${course.slug}`}>
                <ExternalLink /> Ver página
              </Link>
            </Button>
          )}
          <Button variant={course.isPublished ? 'secondary' : 'default'} loading={publish.isPending} disabled={!course.isPublished && blocked} onClick={() => publish.mutate(!course.isPublished)}>
            <Rocket /> {course.isPublished ? 'Despublicar' : 'Publicar curso'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------- Página ----------
const steps: { id: Step; title: string; description: string; icon: typeof Info }[] = [
  { id: 'info', title: 'Informações', description: 'Título, descrição e preço.', icon: Info },
  { id: 'cover', title: 'Capa', description: 'A imagem do catálogo.', icon: ImageIcon },
  { id: 'content', title: 'Conteúdo', description: 'Módulos e aulas em vídeo.', icon: LayoutList },
  { id: 'challenges', title: 'Desafios', description: 'Tarefas práticas com correção.', icon: Target },
  { id: 'publish', title: 'Publicar', description: 'Revise e coloque no ar.', icon: Rocket },
]

export function CourseBuilderPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const current = (steps.find((s) => s.id === params.get('step'))?.id ?? 'info') as Step

  const query = useQuery({
    queryKey: ['course-edit', id],
    queryFn: async () => (await api.get<EditData>(`/courses/${id}/edit`)).data,
  })

  const challengesQuery = useQuery({
    queryKey: ['course-challenges', id],
    queryFn: async () => (await api.get<{ challenges: ChallengeItem[] }>('/courses/' + id + '/challenges')).data.challenges,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['course-challenges', id] })
    queryClient.invalidateQueries({ queryKey: ['course-edit', id] })
    queryClient.invalidateQueries({ queryKey: ['mentor-courses'] })
    queryClient.invalidateQueries({ queryKey: ['courses'] })
  }

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState message={getErrorMessage(query.error, 'Curso não encontrado.')} onRetry={() => query.refetch()} />

  const data = query.data
  const { course, modules } = data
  const lessons = modules.flatMap((m) => m.lessons)
  const done: Record<Step, boolean> = {
    info: course.title.length >= 3 && (course.description ?? '').trim().length >= 40,
    cover: Boolean(course.coverUrl),
    content: lessons.some((l) => l.hasVideo),
    challenges: (challengesQuery.data?.length ?? 0) > 0,
    publish: course.isPublished,
  }
  const go = (step: Step) => setParams({ step }, { replace: true })
  const index = steps.findIndex((s) => s.id === current)
  const active = steps[index]!

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <Link to="/mentor/courses" className="text-[13px] text-muted-foreground hover:text-foreground">
            Meus cursos /
          </Link>
          <h1 className="truncate text-2xl font-bold">{course.title}</h1>
        </div>
        <Badge variant={course.isPublished ? 'success' : 'default'}>{course.isPublished ? 'Publicado' : 'Rascunho'}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Etapas do curso" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => go(step.id)}
              aria-current={current === step.id ? 'step' : undefined}
              className={cn(
                'flex min-w-44 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-faint lg:min-w-0',
                current === step.id && 'border-primary bg-primary-soft hover:bg-primary-soft',
              )}
            >
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', done[step.id] ? 'bg-success text-white' : current === step.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {done[step.id] ? <Check className="size-4" /> : <step.icon className="size-4" />}
              </span>
              <span className="min-w-0 leading-tight">
                <b className="block text-[13px] font-semibold">{step.title}</b>
                <span className="block truncate text-xs text-muted-foreground">{step.description}</span>
              </span>
            </button>
          ))}
        </nav>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{active.title}</CardTitle>
            <span className="text-xs text-muted-foreground tabular">
              Etapa {index + 1} de {steps.length}
            </span>
          </CardHeader>
          <CardContent className="space-y-6">
            {current === 'info' && <InfoStep key={course.id + course.title + course.priceInCents} course={course} onSaved={refresh} />}
            {current === 'cover' && <CoverStep course={course} onSaved={refresh} />}
            {current === 'content' && <ContentStep data={data} onChanged={refresh} />}
            {current === 'challenges' && <ChallengesStep key={(challengesQuery.data ?? []).map((c) => c.id + c.title + c.brief).join('|')} courseId={course.id} challenges={challengesQuery.data ?? []} onChanged={refresh} />}
            {current === 'publish' && <PublishStep data={data} challengesCount={challengesQuery.data?.length ?? 0} onChanged={refresh} goTo={go} />}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="secondary" disabled={index === 0} onClick={() => go(steps[index - 1]!.id)}>
                Voltar
              </Button>
              {index < steps.length - 1 && (
                <Button onClick={() => go(steps[index + 1]!.id)}>
                  Próxima etapa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

