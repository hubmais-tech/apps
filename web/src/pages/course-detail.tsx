import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronDown, Clock, Layers, PlayCircle, ShieldCheck, Smartphone } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { CourseCover } from '@/components/course-card'
import { ErrorState, Loading } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, getErrorMessage, type CourseSummary, type StructureModule } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDuration } from '@/lib/utils'

type Detail = {
  course: CourseSummary & { isPublished: boolean }
  modules: StructureModule[]
  isEnrolled: boolean
  isOwner: boolean
}

export function CourseDetailPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['course', slug, user?.id],
    queryFn: async () => (await api.get<Detail>(`/courses/${slug}`)).data,
  })

  const checkout = useMutation({
    mutationFn: async (courseId: string) => (await api.post<{ url: string }>(`/courses/${courseId}/checkout`)).data,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (isLoading) return <Loading />
  if (isError || !data) return <ErrorState message="Curso não encontrado." onRetry={() => refetch()} />

  const { course, modules, isEnrolled, isOwner } = data
  const lessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const totalSeconds = modules.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + l.durationInSeconds, 0), 0)

  function onBuy() {
    if (!user) {
      navigate('/login', { state: { from: `/courses/${course.slug}` } })
      return
    }
    checkout.mutate(course.id)
  }

  const facts = [
    { icon: Layers, label: `${modules.length} ${modules.length === 1 ? 'módulo' : 'módulos'}` },
    { icon: PlayCircle, label: `${lessonCount} ${lessonCount === 1 ? 'aula' : 'aulas'}` },
    { icon: Clock, label: `${formatDuration(totalSeconds)} de vídeo` },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        <div className="space-y-3">
          {!course.isPublished && <Badge variant="accent">Rascunho, visível só para você</Badge>}
          <h1 className="text-[28px] leading-tight font-bold">{course.title}</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            <span className="grid size-[26px] place-items-center rounded-full bg-lilac-soft text-[11px] font-semibold text-primary">{course.mentorName.charAt(0).toUpperCase()}</span>
            com <strong className="font-semibold text-foreground">{course.mentorName}</strong>
          </p>
          <ul className="flex flex-wrap gap-2">
            {facts.map(({ icon: Icon, label }) => (
              <li key={label} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-faint px-2.5 text-xs font-medium text-muted-foreground">
                <Icon className="size-3.5" /> {label}
              </li>
            ))}
          </ul>
        </div>

        {course.description && (
          <section aria-labelledby="about-title" className="space-y-2">
            <h2 id="about-title" className="text-base font-bold">
              Sobre o curso
            </h2>
            <p className="max-w-[65ch] leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</p>
          </section>
        )}

        <section aria-labelledby="content-title" className="space-y-3">
          <h2 id="content-title" className="text-base font-bold">
            Conteúdo do curso
          </h2>
          <div className="space-y-2">
            {modules.map((mod, index) => (
              <details key={mod.id} open={index === 0} className="group rounded-lg border border-border bg-card open:border-primary">
                <summary className="flex cursor-pointer items-center gap-3 p-3">
                  <span className="grid size-7 place-items-center rounded-md bg-primary-soft text-xs font-bold text-primary">{index + 1}</span>
                  <span className="flex-1 text-sm font-semibold">{mod.title}</span>
                  <span className="text-xs text-muted-foreground">{mod.lessons.length} {mod.lessons.length === 1 ? 'aula' : 'aulas'}</span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <ul className="divide-y divide-border border-t border-border px-3">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                      <span className="flex items-center gap-2.5">
                        <PlayCircle className="size-4 text-primary" />
                        {lesson.title}
                      </span>
                      <span className="text-muted-foreground tabular">{formatDuration(lesson.durationInSeconds)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="overflow-hidden">
          <CourseCover url={course.coverUrl} title={course.title} />
          <div className="space-y-4 p-[18px]">
            <p className="font-heading text-[28px] font-bold tabular">{formatCurrency(course.priceInCents)}</p>
            {isEnrolled || isOwner ? (
              <Button className="w-full" size="lg" asChild>
                <Link to={`/courses/${course.slug}/learn`}>{isOwner ? 'Ver como aluno' : 'Continuar estudando'}</Link>
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={onBuy} loading={checkout.isPending} disabled={!course.isPublished}>
                Comprar curso
              </Button>
            )}
            <ul className="space-y-2 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-success" /> Pagamento seguro
              </li>
              <li className="flex items-center gap-2.5">
                <Smartphone className="size-4 text-success" /> Estude no celular ou no computador
              </li>
            </ul>
          </div>
        </Card>
      </aside>
    </div>
  )
}
