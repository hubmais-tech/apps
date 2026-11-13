import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Award, BookOpen, Check, ClipboardCheck, Clock, Flame, GraduationCap, Mail, PlayCircle, Plus, Star, Users, Wallet } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

import { CourseCard, CourseCover } from '@/components/course-card'
import { EmptyState, ErrorState, Loading, Stat } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { WeekBars } from '@/components/week-bars'
import { api, type CourseSummary } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { CompanyDashboard } from '@/pages/company/home'

type Enrollment = {
  courseId: string
  slug: string
  title: string
  coverUrl: string | null
  mentorName: string
  totalLessons: number
  completedLessons: number
}

type StudentDashboardData = {
  stats: { studySeconds: number; completedLessons: number; streakDays: number; certificates: number; activeCourses: number; finishedCourses: number }
  week: { date: string; lessons: number }[]
  tasks: { challengeId: string; courseSlug: string; courseTitle: string; title: string; state: 'todo' | 'changes_requested' | 'in_review'; feedback: string | null }[]
  invitationsPending: number
  talent: { visible: boolean; validatedProjects: number; hasHeadline: boolean; portfolioItems: number }
}

type MentorDashboardData = {
  courses: { total: number; published: number }
  students: number
  pendingReviews: number
  wallet: { availableInCents: number; pendingInCents: number }
  monthSalesInCents: number
  monthSalesCount: number
  week: { date: string; sales: number }[]
  topCourses: { id: string; title: string; students: number }[]
  recentSales: { id: string; courseTitle: string; amountInCents: number; paidAt: string }[]
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

const percentOf = (e: Enrollment) => (e.totalLessons ? (e.completedLessons / e.totalLessons) * 100 : 0)

/** "2 h 10 min", "45 min". Estimativa pela duração das aulas concluídas (D19). */
function formatStudyTime(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

const taskState = {
  todo: { label: 'Para entregar', variant: 'accent' },
  changes_requested: { label: 'Ajustes pedidos', variant: 'orange' },
  in_review: { label: 'Em correção', variant: 'primary' },
} as const

// ---------------------------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------------------------
function StudentDashboard() {
  const { user } = useAuth()

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    staleTime: 0,
    queryFn: async () => (await api.get<StudentDashboardData>('/me/dashboard')).data,
  })
  const enrollments = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => (await api.get<{ enrollments: Enrollment[] }>('/me/enrollments')).data.enrollments,
  })
  const courses = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get<{ courses: CourseSummary[] }>('/courses')).data.courses,
  })

  if (dashboard.isLoading || enrollments.isLoading || courses.isLoading) return <Loading />
  if (dashboard.isError || enrollments.isError || courses.isError || !dashboard.data) {
    return (
      <ErrorState
        onRetry={() => {
          dashboard.refetch()
          enrollments.refetch()
          courses.refetch()
        }}
      />
    )
  }

  const { stats, week, tasks, invitationsPending, talent } = dashboard.data
  const mine = enrollments.data ?? []
  const next = mine.filter((e) => e.completedLessons < e.totalLessons).sort((a, b) => percentOf(b) - percentOf(a))[0]
  const owned = new Set(mine.map((e) => e.slug))
  const suggestions = (courses.data ?? []).filter((c) => !owned.has(c.slug)).slice(0, 3)

  const path = [
    { label: 'Concluir um curso', done: stats.finishedCourses > 0, to: next ? `/courses/${next.slug}/learn` : '/explore' },
    { label: 'Ter um projeto validado por um mentor', done: talent.validatedProjects > 0, to: '/portfolio' },
    { label: 'Completar seu perfil', done: talent.hasHeadline, to: '/settings?tab=profile' },
    { label: 'Aparecer no Banco de Talentos', done: talent.visible, to: '/portfolio' },
  ]
  const nextStep = path.find((p) => !p.done)

  const subtitle = next
    ? `Faltam ${next.totalLessons - next.completedLessons} ${next.totalLessons - next.completedLessons === 1 ? 'aula' : 'aulas'} para concluir ${next.title}.`
    : tasks.length
      ? `Você tem ${tasks.length} ${tasks.length === 1 ? 'pendência' : 'pendências'} nos desafios.`
      : mine.length
        ? 'Você concluiu tudo por enquanto. Que tal começar outro curso?'
        : 'Escolha seu primeiro curso e comece hoje.'

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <h1 className="text-2xl font-bold">
          {greeting()}, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      {invitationsPending > 0 && (
        <Link to="/invitations" className="flex items-center gap-3 rounded-xl border border-primary bg-primary-soft p-4 transition-colors hover:brightness-95 lg:col-span-12">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Mail className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <b className="block text-sm font-semibold">{invitationsPending === 1 ? 'Uma empresa convidou você para uma vaga' : `${invitationsPending} empresas convidaram você para vagas`}</b>
            <span className="text-[13px] text-muted-foreground">Veja o convite e responda. O contato só é revelado se você aceitar.</span>
          </span>
          <ArrowRight className="size-4 text-primary" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4 lg:gap-4">
        <Stat label="Horas de estudo" value={formatStudyTime(stats.studySeconds)} icon={Clock} tone="warning" hint="Estimativa pelas aulas concluídas" />
        <Stat label="Sequência" value={`${stats.streakDays} ${stats.streakDays === 1 ? 'dia' : 'dias'}`} icon={Flame} tone="orange" hint={stats.streakDays ? 'Estude hoje para manter' : 'Conclua uma aula hoje'} />
        <Stat label="Aulas concluídas" value={stats.completedLessons} icon={BookOpen} hint={`${stats.activeCourses} em andamento`} />
        <Stat label="Certificados" value={stats.certificates} icon={Award} tone="success" hint={stats.finishedCourses ? `${stats.finishedCourses} ${stats.finishedCourses === 1 ? 'curso concluído' : 'cursos concluídos'}` : 'Conclua um curso para emitir'} />
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
              <CourseCover url={next.coverUrl} title={next.title} seed={next.slug} className="rounded-lg" />
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
              <EmptyState className="border-0 py-6">
                <p className="mb-3">{mine.length ? 'Nenhum curso em andamento.' : 'Você ainda não tem cursos.'}</p>
                <Button asChild>
                  <Link to="/explore">Explorar cursos</Link>
                </Button>
              </EmptyState>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade da semana</CardTitle>
            <span className="text-xs text-muted-foreground">Aulas concluídas por dia</span>
          </CardHeader>
          <CardContent className="pt-4">
            <WeekBars data={week.map((d) => ({ date: d.date, value: d.lessons }))} unit={{ one: 'aula', other: 'aulas' }} />
          </CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle>Desafios pendentes</CardTitle>
            {tasks.length > 0 && <Badge variant="orange">{tasks.length}</Badge>}
          </CardHeader>
          {tasks.length === 0 ? (
            <p className="p-[18px] text-[13px] text-muted-foreground">Nenhum desafio pendente. Os desafios dos seus cursos aparecem aqui.</p>
          ) : (
            <ul>
              {tasks.map((task) => (
                <li key={task.challengeId} className="border-t border-border first:border-t-0">
                  <Link to={`/courses/${task.courseSlug}/learn`} className="flex flex-col gap-1.5 px-[18px] py-3 hover:bg-faint">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[13px] leading-tight font-semibold">{task.title}</span>
                      <Badge variant={taskState[task.state].variant}>{taskState[task.state].label}</Badge>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{task.courseTitle}</span>
                    {task.feedback && task.state === 'changes_requested' && <span className="line-clamp-2 rounded-md bg-sand-soft px-2 py-1 text-xs text-warning">“{task.feedback}”</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caminho até o Banco de Talentos</CardTitle>
          </CardHeader>
          <ul>
            {path.map((step, index) => (
              <li key={step.label} className="flex items-start gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
                <span className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold', step.done ? 'bg-success text-white' : step === nextStep ? 'bg-orange text-white' : 'border-[1.5px] border-border text-muted-foreground')}>
                  {step.done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className={cn('block text-[13px] font-semibold', !step.done && step !== nextStep && 'text-muted-foreground')}>{step.label}</b>
                  {step === nextStep && (
                    <Link to={step.to} className="text-xs font-semibold text-primary hover:underline">
                      Fazer agora
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {!nextStep && <p className="border-t border-border px-[18px] py-3 text-xs text-muted-foreground">Você está visível para empresas de Aracaju e região.</p>}
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Mentor
// ---------------------------------------------------------------------------------------------
function MentorDashboard() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['mentor-dashboard'],
    staleTime: 0,
    queryFn: async () => (await api.get<MentorDashboardData>('/me/mentor-dashboard')).data,
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />
  const d = query.data

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="flex flex-wrap items-end justify-between gap-3 lg:col-span-12">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}, {user?.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">{d.pendingReviews ? `${d.pendingReviews} ${d.pendingReviews === 1 ? 'entrega espera' : 'entregas esperam'} a sua correção.` : 'Resumo dos seus cursos e das suas vendas.'}</p>
        </div>
        <Button asChild>
          <Link to="/mentor/courses/new">
            <Plus /> Novo curso
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4 lg:gap-4">
        <Stat label="Vendas no mês" value={formatCurrency(d.monthSalesInCents)} icon={Star} tone="orange" hint={`${d.monthSalesCount} ${d.monthSalesCount === 1 ? 'venda' : 'vendas'}, já descontada a retenção`} />
        <Stat label="Disponível para saque" value={formatCurrency(d.wallet.availableInCents)} icon={Wallet} tone="success" hint={`${formatCurrency(d.wallet.pendingInCents)} pendente`} />
        <Stat label="Alunos" value={d.students} icon={Users} hint={`${d.courses.published} de ${d.courses.total} ${d.courses.total === 1 ? 'curso publicado' : 'cursos publicados'}`} />
        <Stat label="Entregas para corrigir" value={d.pendingReviews} icon={ClipboardCheck} tone={d.pendingReviews ? 'warning' : 'primary'} hint={d.pendingReviews ? 'Corrija para liberar o certificado' : 'Tudo em dia'} />
      </div>

      <div className="space-y-5 lg:col-span-8">
        <Card>
          <CardHeader>
            <CardTitle>Vendas da semana</CardTitle>
            <span className="text-xs text-muted-foreground">Vendas por dia</span>
          </CardHeader>
          <CardContent className="pt-4">
            <WeekBars data={d.week.map((w) => ({ date: w.date, value: w.sales }))} unit={{ one: 'venda', other: 'vendas' }} tone="primary" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas recentes</CardTitle>
            <Link to="/mentor/wallet" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
              Carteira <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          {d.recentSales.length === 0 ? (
            <p className="p-[18px] text-[13px] text-muted-foreground">Nenhuma venda ainda. Publique um curso e divulgue o link para começar.</p>
          ) : (
            <ul>
              {d.recentSales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
                  <span className="min-w-0 leading-tight">
                    <b className="block truncate text-[13px] font-semibold">{sale.courseTitle}</b>
                    <span className="text-xs text-muted-foreground">{formatDate(sale.paidAt)}</span>
                  </span>
                  <span className="text-[13px] font-semibold text-success tabular">+ {formatCurrency(sale.amountInCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-5 lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Seus cursos</CardTitle>
            <Link to="/mentor/courses" className="text-[13px] font-semibold text-primary hover:underline">
              Gerenciar
            </Link>
          </CardHeader>
          {d.topCourses.length === 0 ? (
            <div className="space-y-3 p-[18px]">
              <p className="text-[13px] text-muted-foreground">Você ainda não criou cursos.</p>
              <Button size="sm" asChild>
                <Link to="/mentor/courses/new">
                  <Plus /> Criar meu primeiro curso
                </Link>
              </Button>
            </div>
          ) : (
            <ul>
              {d.topCourses.map((course) => (
                <li key={course.id} className="border-t border-border first:border-t-0">
                  <Link to={`/mentor/courses/${course.id}`} className="flex items-center justify-between gap-3 px-[18px] py-3 hover:bg-faint">
                    <span className="truncate text-[13px] font-semibold">{course.title}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular">
                      <Users className="size-3.5" /> {course.students}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
              <GraduationCap className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block text-[13px] font-semibold">Correções</b>
              <span className="text-xs text-muted-foreground">Aprovar o último desafio emite o certificado do aluno.</span>
            </span>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/mentor/reviews">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Painel de "/": cada perfil vê o seu. Admin vai para a visão geral; visitante, para o catálogo. */
export function HomePage() {
  const { user, onboarding } = useAuth()

  // Visitante sem login vê a página inicial pública (RootPage), nunca este painel.
  if (!user) return null
  if (onboarding?.required && !onboarding.completed) return <Navigate to="/onboarding" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  if (user.role === 'mentor') return <MentorDashboard />
  if (user.role === 'company') return <CompanyDashboard />
  return <StudentDashboard />
}
