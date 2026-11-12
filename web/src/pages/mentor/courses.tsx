import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CourseCover } from '@/components/course-card'
import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type MentorCourse = {
  id: string
  slug: string
  title: string
  priceInCents: number
  isPublished: boolean
  coverUrl: string | null
  salesCount: number
}

export function MentorCoursesPage() {
  const courses = useQuery({
    queryKey: ['mentor-courses'],
    queryFn: async () => (await api.get<{ courses: MentorCourse[] }>('/me/courses')).data.courses,
  })

  return (
    <div>
      <PageHeader
        title="Meus cursos"
        description="Crie cursos, envie as aulas e acompanhe as vendas."
        actions={
          <Button asChild>
            <Link to="/mentor/courses/new">
              <Plus /> Novo curso
            </Link>
          </Button>
        }
      />

      {courses.isLoading && <Loading />}
      {courses.isError && <ErrorState onRetry={() => courses.refetch()} />}
      {courses.data && courses.data.length === 0 && (
        <EmptyState>
          <p className="mb-3">Você ainda não criou nenhum curso. Leva poucos minutos para começar.</p>
          <Button asChild>
            <Link to="/mentor/courses/new">
              <Plus /> Criar meu primeiro curso
            </Link>
          </Button>
        </EmptyState>
      )}
      {courses.data && courses.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.data.map((course) => (
            <article key={course.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
              <Link to={`/mentor/courses/${course.id}`} className="outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Editar ${course.title}`}>
                <CourseCover url={course.coverUrl} title={course.title} seed={course.slug} />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{course.title}</h3>
                  <Badge variant={course.isPublished ? 'success' : 'default'}>{course.isPublished ? 'Publicado' : 'Rascunho'}</Badge>
                </div>
                <p className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-heading text-sm font-semibold text-foreground tabular">{formatCurrency(course.priceInCents)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" /> {course.salesCount} {course.salesCount === 1 ? 'aluno' : 'alunos'}
                  </span>
                </p>
                <Button variant="secondary" size="sm" className="mt-auto" asChild>
                  <Link to={`/mentor/courses/${course.id}`}>
                    <Pencil /> {course.isPublished ? 'Editar curso' : 'Continuar montando'}
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
