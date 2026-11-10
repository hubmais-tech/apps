import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronLeft, ChevronRight, Lock, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ErrorState, Loading } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { api, getErrorMessage } from '@/lib/api'
import { cn, formatDuration } from '@/lib/utils'

type LearnData = {
  course: { id: string; title: string; slug: string }
  modules: {
    id: string
    title: string
    lessons: { id: string; title: string; durationInSeconds: number; hasVideo: boolean; completed: boolean }[]
  }[]
}

export function LearnPage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const queryClient = useQueryClient()
  const [currentId, setCurrentId] = useState<string | null>(null)

  const learn = useQuery({
    queryKey: ['learn', slug],
    queryFn: async () => (await api.get<LearnData>(`/courses/${slug}/learn`)).data,
    // Logo após o pagamento a matrícula pode levar alguns segundos (webhook). Tenta de novo.
    retry: params.get('paid') ? 5 : 1,
    retryDelay: 2000,
  })

  const lessons = useMemo(() => learn.data?.modules.flatMap((m) => m.lessons) ?? [], [learn.data])
  const current = lessons.find((l) => l.id === currentId) ?? lessons.find((l) => !l.completed && l.hasVideo) ?? lessons.find((l) => l.hasVideo)

  useEffect(() => {
    if (!currentId && current) setCurrentId(current.id)
  }, [current, currentId])

  const video = useQuery({
    queryKey: ['video-url', current?.id],
    enabled: Boolean(current?.hasVideo),
    // A URL assinada dura 2h. Renova antes disso.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await api.get<{ url: string }>(`/lessons/${current!.id}/video-url`)).data.url,
  })

  const complete = useMutation({
    mutationFn: (lessonId: string) => api.post(`/lessons/${lessonId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learn', slug] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Aula concluída!')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (learn.isLoading) return <Loading />
  if (learn.isError || !learn.data) {
    return (
      <ErrorState
        message={
          params.get('paid')
            ? 'Estamos confirmando o seu pagamento. Atualize em alguns instantes.'
            : getErrorMessage(learn.error, 'Você ainda não tem acesso a este curso.')
        }
        onRetry={() => learn.refetch()}
      />
    )
  }


  const done = lessons.filter((l) => l.completed).length
  const percent = lessons.length ? (done / lessons.length) * 100 : 0
  const playable = lessons.filter((l) => l.hasVideo)
  const index = playable.findIndex((l) => l.id === current?.id)
  const previous = index > 0 ? playable[index - 1] : undefined
  const next = index >= 0 ? playable[index + 1] : undefined
  const currentModule = learn.data.modules.find((m) => m.lessons.some((l) => l.id === current?.id))

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-4">
        <nav aria-label="Trilha" className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link to="/my-learning" className="hover:text-foreground">
            Meus estudos
          </Link>
          <span>/</span>
          <Link to={`/courses/${learn.data.course.slug}`} className="font-semibold text-foreground hover:underline">
            {learn.data.course.title}
          </Link>
        </nav>

        <div className="space-y-2">
          <h1 className="text-2xl leading-tight font-bold">{current?.title ?? 'Nenhuma aula disponível ainda'}</h1>
          {currentModule && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border bg-faint px-2 py-1">{currentModule.title}</span>
              {current && <span className="rounded-md border border-border bg-faint px-2 py-1 tabular">{formatDuration(current.durationInSeconds)}</span>}
            </p>
          )}
        </div>

        <div className="aspect-video overflow-hidden rounded-xl bg-video">
          {video.data ? (
            <video key={video.data} src={video.data} controls controlsList="nodownload" className="size-full" />
          ) : (
            <div className="grid size-full place-items-center text-sm text-white/60">
              {video.isLoading ? 'Carregando vídeo…' : video.isError ? 'Não foi possível carregar o vídeo.' : 'Selecione uma aula'}
            </div>
          )}
        </div>

        {current && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="secondary" disabled={!previous} onClick={() => previous && setCurrentId(previous.id)}>
              <ChevronLeft /> Anterior
            </Button>
            <Button
              onClick={() => complete.mutate(current.id, { onSuccess: () => next && setCurrentId(next.id) })}
              loading={complete.isPending}
              disabled={current.completed}
              variant={current.completed ? 'soft' : 'default'}
            >
              <Check /> {current.completed ? 'Aula concluída' : next ? 'Concluir e ir para a próxima' : 'Concluir aula'}
            </Button>
            <Button variant="secondary" disabled={!next} onClick={() => next && setCurrentId(next.id)}>
              Próxima <ChevronRight />
            </Button>
          </div>
        )}
      </div>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-border px-[18px] py-4">
            <h2 className="text-base font-bold">Conteúdo do curso</h2>
            <span className="text-xs text-muted-foreground tabular">{lessons.length} aulas</span>
          </div>
          <div className="space-y-2 border-b border-border px-[18px] py-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Seu progresso</span>
              <b className="tabular">
                {done} de {lessons.length}
              </b>
            </div>
            <Progress value={percent} />
          </div>

          <nav aria-label="Módulos" className="space-y-2 p-3">
            {learn.data.modules.map((mod, modIndex) => {
              const modDone = mod.lessons.length > 0 && mod.lessons.every((l) => l.completed)
              const isCurrent = mod.id === currentModule?.id
              return (
                <details key={mod.id} open={isCurrent || undefined} className="group rounded-lg border border-border bg-surface open:border-primary">
                  <summary className="flex cursor-pointer items-center gap-2.5 p-2.5">
                    <span className={cn('grid size-[26px] shrink-0 place-items-center rounded-full', modDone ? 'bg-success text-white' : isCurrent ? 'bg-primary text-primary-foreground' : 'border-[1.5px] border-border text-muted-foreground')}>
                      {modDone ? <Check className="size-3.5" /> : isCurrent ? <Play className="size-3 fill-current" /> : <span className="text-[11px] font-semibold">{modIndex + 1}</span>}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block truncate text-[13px] font-semibold">{mod.title}</b>
                      <span className="text-xs text-muted-foreground">
                        {modDone ? 'Concluído' : `${mod.lessons.filter((l) => l.completed).length} de ${mod.lessons.length}`} · {mod.lessons.length} {mod.lessons.length === 1 ? 'aula' : 'aulas'}
                      </span>
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="space-y-0.5 border-t border-border p-1.5">
                    {mod.lessons.map((lesson) => {
                      const active = lesson.id === current?.id
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            disabled={!lesson.hasVideo}
                            onClick={() => setCurrentId(lesson.id)}
                            aria-current={active}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-md p-2 text-left text-[13px] transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-55',
                              active && 'bg-primary-soft font-semibold text-primary hover:bg-primary-soft',
                            )}
                          >
                            <span className={cn('grid size-5 shrink-0 place-items-center rounded-full', lesson.completed ? 'bg-success text-white' : active ? 'bg-primary text-primary-foreground' : 'border-[1.5px] border-border text-muted-foreground')}>
                              {lesson.completed ? <Check className="size-3" /> : !lesson.hasVideo ? <Lock className="size-2.5" /> : active ? <Play className="size-2.5 fill-current" /> : null}
                            </span>
                            <span className="min-w-0 flex-1">{lesson.title}</span>
                            <span className="text-xs text-muted-foreground tabular">{formatDuration(lesson.durationInSeconds)}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              )
            })}
          </nav>
        </Card>
      </aside>
    </div>
  )
}
