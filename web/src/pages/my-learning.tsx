import { useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CourseCover } from '@/components/course-card'
import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { api } from '@/lib/api'

type Enrollment = {
  courseId: string
  slug: string
  title: string
  coverUrl: string | null
  mentorName: string
  totalLessons: number
  completedLessons: number
}

export function MyLearningPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => (await api.get<{ enrollments: Enrollment[] }>('/me/enrollments')).data.enrollments,
  })

  return (
    <div>
      <PageHeader title="Meus estudos" description="Continue de onde parou." />
      {isLoading && <Loading />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState>
          <p className="mb-3">Você ainda não tem cursos.</p>
          <Button asChild>
            <Link to="/explore">Explorar cursos</Link>
          </Button>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => {
            const percent = item.totalLessons ? (item.completedLessons / item.totalLessons) * 100 : 0
            const finished = item.totalLessons > 0 && item.completedLessons >= item.totalLessons
            return (
              <Link
                key={item.courseId}
                to={`/courses/${item.slug}/learn`}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CourseCover url={item.coverUrl} title={item.title} />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.mentorName}</p>
                  </div>
                  <Progress value={percent} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular">
                      {item.completedLessons} de {item.totalLessons} aulas
                    </span>
                    {finished ? (
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" /> Concluído
                      </Badge>
                    ) : (
                      <span className="tabular">{Math.round(percent)}%</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
