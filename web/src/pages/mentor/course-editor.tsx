import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { CourseCover } from '@/components/course-card'
import { ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { api, getErrorMessage, type StructureModule } from '@/lib/api'
import { formatDuration } from '@/lib/utils'

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

/** Envia o arquivo direto ao R2 pela URL pré-assinada. O binário nunca passa pela API. */
async function uploadToR2(courseId: string, kind: 'cover' | 'video', file: File, onProgress?: (percent: number) => void) {
  const { data } = await api.post<{ uploadUrl: string; key: string }>(`/courses/${courseId}/uploads`, {
    kind,
    contentType: file.type,
  })
  await axios.put(data.uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (event) => onProgress?.(event.total ? (event.loaded / event.total) * 100 : 0),
  })
  return data.key
}

function readVideoDuration(file: File) {
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

function AddLesson({ courseId, moduleId, onDone }: { courseId: string; moduleId: string; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState<number | null>(null)

  const add = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0]
      let videoKey: string | undefined
      let durationInSeconds = 0
      if (file) {
        durationInSeconds = await readVideoDuration(file)
        videoKey = await uploadToR2(courseId, 'video', file, setProgress)
      }
      await api.post(`/modules/${moduleId}/lessons`, { title, videoKey, durationInSeconds })
    },
    onSuccess: () => {
      setTitle('')
      setProgress(null)
      if (fileRef.current) fileRef.current.value = ''
      toast.success('Aula adicionada.')
      onDone()
    },
    onError: (error) => {
      setProgress(null)
      toast.error(getErrorMessage(error, 'Falha no envio do vídeo. Verifique a configuração de CORS do bucket.'))
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    add.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
      <Input aria-label="Título da aula" placeholder="Título da nova aula" required minLength={2} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input aria-label="Arquivo de vídeo" ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="pt-1.5 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs" />
      <Button type="submit" variant="secondary" loading={add.isPending}>
        <Upload /> Adicionar
      </Button>
      {progress !== null && (
        <div className="sm:col-span-3">
          <Progress value={progress} />
        </div>
      )}
    </form>
  )
}

export function CourseEditorPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const coverRef = useRef<HTMLInputElement>(null)
  const [moduleTitle, setModuleTitle] = useState('')

  const query = useQuery({
    queryKey: ['course-edit', id],
    queryFn: async () => (await api.get<EditData>(`/courses/${id}/edit`)).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['course-edit', id] })
    queryClient.invalidateQueries({ queryKey: ['mentor-courses'] })
    queryClient.invalidateQueries({ queryKey: ['courses'] })
  }
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  const saveDetails = useMutation({
    mutationFn: (body: { title: string; description: string; priceInCents: number }) => api.patch(`/courses/${id}`, body),
    onSuccess: () => {
      toast.success('Curso atualizado.')
      refresh()
    },
    onError,
  })

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      const key = await uploadToR2(id!, 'cover', file)
      await api.patch(`/courses/${id}`, { coverKey: key })
    },
    onSuccess: () => {
      toast.success('Capa atualizada.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Falha no envio da capa. Verifique a configuração de CORS do bucket.')),
  })

  const addModule = useMutation({
    mutationFn: () => api.post(`/courses/${id}/modules`, { title: moduleTitle }),
    onSuccess: () => {
      setModuleTitle('')
      refresh()
    },
    onError,
  })

  const removeModule = useMutation({ mutationFn: (moduleId: string) => api.delete(`/modules/${moduleId}`), onSuccess: refresh, onError })
  const removeLesson = useMutation({ mutationFn: (lessonId: string) => api.delete(`/lessons/${lessonId}`), onSuccess: refresh, onError })

  const publish = useMutation({
    mutationFn: (published: boolean) => api.post(`/courses/${id}/publish`, { published }),
    onSuccess: (_data, published) => {
      toast.success(published ? 'Curso publicado!' : 'Curso despublicado.')
      refresh()
    },
    onError,
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState message={getErrorMessage(query.error, 'Curso não encontrado.')} onRetry={() => query.refetch()} />

  const { course, modules } = query.data

  function onSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    saveDetails.mutate({
      title: String(form.get('title')),
      description: String(form.get('description')),
      priceInCents: Math.round(Number(String(form.get('price')).replace(',', '.')) * 100),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={course.title}
        description="Edite os dados, monte o conteúdo e publique."
        actions={
          <div className="flex items-center gap-3">
            <Badge variant={course.isPublished ? 'success' : 'default'}>{course.isPublished ? 'Publicado' : 'Rascunho'}</Badge>
            {course.isPublished && (
              <Button variant="outline" asChild>
                <Link to={`/courses/${course.slug}`}>Ver página</Link>
              </Button>
            )}
            <Button variant={course.isPublished ? 'outline' : 'default'} loading={publish.isPending} onClick={() => publish.mutate(!course.isPublished)}>
              {course.isPublished ? 'Despublicar' : 'Publicar'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do curso</CardTitle>
            </CardHeader>
            <CardContent>
              <form key={course.title + course.priceInCents} onSubmit={onSaveDetails} className="space-y-4">
                <Field label="Título" htmlFor="title">
                  <Input id="title" name="title" required minLength={3} defaultValue={course.title} />
                </Field>
                <Field label="Descrição" htmlFor="description">
                  <Textarea id="description" name="description" defaultValue={course.description ?? ''} />
                </Field>
                <Field label="Preço (R$)" htmlFor="price" hint="Mínimo de R$ 5,00.">
                  <Input id="price" name="price" inputMode="decimal" required defaultValue={(course.priceInCents / 100).toFixed(2).replace('.', ',')} />
                </Field>
                <Button type="submit" loading={saveDetails.isPending}>
                  Salvar alterações
                </Button>
              </form>
            </CardContent>
          </Card>

          <section aria-labelledby="content-title" className="space-y-3">
            <h2 id="content-title" className="text-lg font-bold">
              Conteúdo
            </h2>
            {modules.map((mod) => (
              <Card key={mod.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{mod.title}</CardTitle>
                  <Button variant="ghost" size="icon" aria-label={`Remover módulo ${mod.title}`} onClick={() => removeModule.mutate(mod.id)}>
                    <Trash2 />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span>{lesson.title}</span>
                        <span className="flex items-center gap-3 text-muted-foreground">
                          {lesson.hasVideo ? formatDuration(lesson.durationInSeconds) : <Badge variant="accent">Sem vídeo</Badge>}
                          <Button variant="ghost" size="icon" aria-label={`Remover aula ${lesson.title}`} onClick={() => removeLesson.mutate(lesson.id)}>
                            <Trash2 />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <AddLesson courseId={course.id} moduleId={mod.id} onDone={refresh} />
                </CardContent>
              </Card>
            ))}

            <form
              onSubmit={(event) => {
                event.preventDefault()
                addModule.mutate()
              }}
              className="flex gap-3"
            >
              <Input aria-label="Título do novo módulo" placeholder="Título do novo módulo" required minLength={2} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
              <Button type="submit" variant="secondary" loading={addModule.isPending}>
                <Plus /> Módulo
              </Button>
            </form>
          </section>
        </div>

        <aside>
          <Card className="overflow-hidden">
            <CourseCover url={course.coverUrl} title={course.title} />
            <div className="space-y-2 p-4">
              <input
                ref={coverRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Selecionar capa"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) uploadCover.mutate(file)
                }}
              />
              <Button variant="outline" className="w-full" loading={uploadCover.isPending} onClick={() => coverRef.current?.click()}>
                <ImagePlus /> {course.coverUrl ? 'Trocar capa' : 'Enviar capa'}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, proporção 16:9.</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
