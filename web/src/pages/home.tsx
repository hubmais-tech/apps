import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpen, Briefcase, CheckCircle2, GraduationCap, Percent, PlayCircle } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { CourseCard, CourseCover } from '@/components/course-card'
import { EmptyState, ErrorState, Loading, Stat } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { api, type CourseSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'

type Enrollment = {
  courseId: string
  slug: string
  title: string
  coverUrl: string | null
  mentorName: string
  totalLessons: number
  completedLessons: number
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const percentOf = (e: Enrollment) => (e.totalLessons ? (e.completedLessons / e.totalLessons) * 100 : 0)

/** Painel do aluno. Admin vai direto para a carteira do Hub+; quem não está logado vê o catálogo. */
export function HomePage() {
  const { user } = useAuth()

  const enrollments = useQuery({
    queryKey: ['enrollments'],
    enabled: Boolean(user) && user?.role !== 'admin',
    queryFn: async () => (await api.get<{ enrollments: Enrollment[] }>('/me/enrollments')).data.enrollments,
  })
  const courses = useQuery({
    queryKey: ['courses'],
    enabled: Boolean(user) && user?.role !== 'admin',
    queryFn: async () => (await api.get<{ courses: CourseSummary[] }>('/courses')).data.courses,
  })

  if (!user) return <Navigate to="/explore" replace />
  if (user.role === 'admin') return <Navigate to="/admin/wallet" replace />

  if (enrollments.isLoading || courses.isLoading) return <Loading />
  if (enrollments.isError || courses.isError) {
    return <ErrorState onRetry={() => { enrollments.refetch(); courses.refetch() }} />
  }

  const mine = enrollments.data ?? []
  const inProgress = mine.filter((e) => e.completedLessons < e.totalLessons)
  const finished = mine.filter((e) => e.totalLessons > 0 && e.completedLessons >= e.totalLessons)
  const lessonsDone = mine.reduce((sum, e) => sum + e.completedLessons, 0)
  const lessonsTotal = mine.reduce((sum, e) => sum + e.totalLessons, 0)
  const average = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0
  const next = [...inProgress].sort((a, b) => percentOf(b) - percentOf(a))[0]
  const owned = new Set(mine.map((e) => e.slug))
  const suggestions = (courses.data ?? []).filter((c) => !owned.has(c.slug)).slice(0, 3)

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <h1 className="text-2xl font-bold">
          {greeting()}, {user.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          {next ? `Faltam ${next.totalLessons - next.completedLessons} ${next.totalLessons - next.completedLessons === 1 ? 'aula' : 'aulas'} para concluir ${next.title}.` : mine.length ? 'Você concluiu todos os seus cursos. Que tal começar outro?' : 'Escolha seu primeiro curso e comece hoje.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4 lg:gap-4">
        <Stat label="Em andamento" value={inProgress.length} icon={BookOpen} hint={`${mine.length} ${mine.length === 1 ? 'curso' : 'cursos'} no total`} />
        <Stat label="Concluídos" value={finished.length} icon={GraduationCap} tone="success" hint={finished.length ? 'Parabéns!' : 'Seu primeiro está a caminho'} />
        <Stat label="Aulas concluídas" value={lessonsDone} icon={CheckCircle2} tone="orange" hint={`de ${lessonsTotal} nos seus cursos`} />
        <Stat label="Progresso médio" value={`${average}%`} icon={Percent} tone="warning" hint="Somando todos os cursos" />
      </div>

      <div className="space-y-5 lg:col-span-8">
        <Card>
          <CardHeader>
            <CardTitle>Continuar estudando</CardTitle>
            <Link to="/my-learning" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
              Meus estudos <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          {next ? (
            <div className="grid items-center gap-4 p-[18px] sm:grid-cols-[200px_1fr]">
              <CourseCover url={next.coverUrl} title={next.title} className="rounded-lg" />
              <div className="min-w-0 space-y-3">
                <div>
                  <h3 className="text-base font-semibold">{next.title}</h3>
                  <p className="text-muted-foreground">com {next.mentorName}</p>
                </div>
                <Progress value={percentOf(next)} />
                <p className="text-xs text-muted-foreground tabular">
                  {next.completedLessons} de {next.totalLessons} aulas · {Math.round(percentOf(next))}%
                </p>
                <Button asChild>
                  <Link to={`/courses/${next.slug}/learn`}>
                    <PlayCircle /> Continuar aula
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <CardContent>
              <EmptyState className="border-0 py-6">Nenhum curso em andamento.</EmptyState>
            </CardContent>
          )}
        </Card>

        <section aria-labelledby="suggestions-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="suggestions-title" className="text-base font-bold">
              Cursos para você
            </h2>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/explore">Ver catálogo</Link>
            </Button>
          </div>
          {suggestions.length === 0 ? (
            <EmptyState>Você já tem todos os cursos disponíveis. Novos cursos chegam em breve.</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {suggestions.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-5 lg:col-span-4">
        {mine.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Seus cursos</CardTitle>
            </CardHeader>
            <ul>
              {mine.slice(0, 4).map((e) => (
                <li key={e.courseId} className="border-t border-border first:border-t-0">
                  <Link to={`/courses/${e.slug}/learn`} className="flex flex-col gap-2 px-[18px] py-3 hover:bg-faint">
                    <span className="flex items-center justify-between gap-3 text-[13px] font-semibold">
                      <span className="truncate">{e.title}</span>
                      <span className="text-xs font-medium text-muted-foreground tabular">{Math.round(percentOf(e))}%</span>
                    </span>
                    <Progress value={percentOf(e)} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-3">
            <span className="grid size-9 place-items-center rounded-lg bg-orange-soft text-orange">
              <Briefcase className="size-[18px]" />
            </span>
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-base font-bold">
                Banco de Talentos <Badge variant="orange">Em breve</Badge>
              </h2>
              <p className="text-muted-foreground">Conclua cursos e desafios, monte seu portfólio e seja encontrado por empresas de Aracaju e região.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
