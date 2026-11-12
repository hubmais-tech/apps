import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Check, ChevronDown, ChevronLeft, ChevronRight, Lock, Play, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ErrorState, Loading } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { api, getErrorMessage } from '@/lib/api'
import { ChallengesPanel, type LearnChallenge } from '@/pages/student/challenges-panel'
import { cn, formatDuration } from '@/lib/utils'

type LearnData = {
  course: { id: string; title: string; slug: string }
  completion: { totalLessons: number; completedLessons: number; totalChallenges: number; approvedChallenges: number; complete: boolean }
  certificateCode: string | null
  challenges: LearnChallenge[]
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
  const navigate = useNavigate()
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'challenges'>(params.get('tab') === 'desafios' ? 'challenges' : 'overview')

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
    mutationFn: async (lessonId: string) => (await api.post<{ certificateCode: string | null }>(`/lessons/${lessonId}/complete`)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['learn', slug] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['certificates'] })
      if (data.certificateCode && !learn.data?.certificateCode) {
        const code = data.certificateCode
        toast.success('Parabéns! Você concluiu o curso e ganhou o certificado.', { action: { label: 'Ver certificado', onClick: () => navigate(`/certificado/${code}`) } })
      } else {
        toast.success('Aula concluída!')
      }
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
  const completion = learn.data.completion
  const missingChallenges = completion.totalChallenges - completion.approvedChallenges

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

        {learn.data.completion.complete && learn.data.certificateCode && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success bg-mint-soft p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-success text-white">
                <Award className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="font-bold">Curso concluído!</p>
                <p className="text-[13px] text-muted-foreground">Seu certificado está pronto. Código {learn.data.certificateCode}.</p>
              </div>
            </div>
            <Button asChild>
              <Link to={`/certificado/${learn.data.certificateCode}`}>Ver certificado</Link>
            </Button>
          </div>
        )}

        <section aria-label="Detalhes da aula" className="rounded-xl border border-border bg-card">
          <div role="tablist" aria-label="Abas da aula" className="flex gap-1 border-b border-border px-3">
            {(
              [
                { id: 'overview', label: 'Visão geral', count: 0 },
                { id: 'challenges', label: 'Desafios', count: learn.data.challenges.length },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground', tab === item.id && 'border-primary font-semibold text-primary')}
              >
                {item.label}
                {item.count > 0 && <span className="rounded-full bg-muted px-1.5 text-[11px] tabular">{item.count}</span>}
              </button>
            ))}
          </div>

          <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" hidden={tab !== 'overview'} className="space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border bg-faint p-3.5">
                <p className="flex items-center justify-between text-[13px] font-semibold">
                  Aulas <span className="text-xs font-medium text-muted-foreground tabular">{completion.completedLessons} de {completion.totalLessons}</span>
                </p>
                <Progress value={completion.totalLessons ? (completion.completedLessons / completion.totalLessons) * 100 : 0} />
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-faint p-3.5">
                <p className="flex items-center justify-between text-[13px] font-semibold">
                  Desafios aprovados <span className="text-xs font-medium text-muted-foreground tabular">{completion.approvedChallenges} de {completion.totalChallenges}</span>
                </p>
                <Progress tone="primary" value={completion.totalChallenges ? (completion.approvedChallenges / completion.totalChallenges) * 100 : 0} />
              </div>
            </div>
            {missingChallenges > 0 && completion.completedLessons >= completion.totalLessons && completion.totalLessons > 0 && (
              <p className="flex items-start gap-2 rounded-lg bg-sand-soft p-3 text-[13px] text-warning">
                <Trophy className="mt-0.5 size-4 shrink-0" />
                <span>
                  Você terminou as aulas. Falta aprovar {missingChallenges} {missingChallenges === 1 ? 'desafio' : 'desafios'} para receber o certificado.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => setTab('challenges')}>
                    Ir para os desafios
                  </button>
                </span>
              </p>
            )}
            {currentModule && current && (
              <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">Módulo</dt>
                  <dd>{currentModule.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">Duração</dt>
                  <dd className="tabular">{formatDuration(current.durationInSeconds)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground uppercase">Situação</dt>
                  <dd>{current.completed ? 'Concluída' : 'Em andamento'}</dd>
                </div>
              </dl>
            )}
          </div>

          <div id="panel-challenges" role="tabpanel" aria-labelledby="tab-challenges" hidden={tab !== 'challenges'} className="p-4 sm:p-5">
            <ChallengesPanel challenges={learn.data.challenges} onChanged={() => queryClient.invalidateQueries({ queryKey: ['learn', slug] })} />
          </div>
        </section>
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
