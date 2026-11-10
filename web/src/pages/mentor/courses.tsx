import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
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
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')

  const courses = useQuery({
    queryKey: ['mentor-courses'],
    queryFn: async () => (await api.get<{ courses: MentorCourse[] }>('/me/courses')).data.courses,
  })

  const create = useMutation({
    mutationFn: async () => {
      const priceInCents = Math.round(Number(price.replace(',', '.')) * 100)
      return (await api.post<{ courseId: string }>('/courses', { title, description: description || undefined, priceInCents })).data
    },
    onSuccess: ({ courseId }) => {
      toast.success('Curso criado. Agora monte os módulos e aulas.')
      navigate(`/mentor/courses/${courseId}`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    create.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus cursos"
        description="Crie cursos, envie as aulas e acompanhe as vendas."
        actions={
          <Button onClick={() => setCreating((value) => !value)}>
            <Plus /> Novo curso
          </Button>
        }
      />

      {creating && (
        <Card className="p-5">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Título" htmlFor="title">
                <Input id="title" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Descrição" htmlFor="description">
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>
            <Field label="Preço (R$)" htmlFor="price" hint="Mínimo de R$ 5,00.">
              <Input id="price" inputMode="decimal" required placeholder="99,90" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={create.isPending}>
                Criar e continuar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {courses.isLoading && <Loading />}
      {courses.isError && <ErrorState onRetry={() => courses.refetch()} />}
      {courses.data && courses.data.length === 0 && !creating && <EmptyState>Você ainda não criou nenhum curso.</EmptyState>}
      {courses.data && courses.data.length > 0 && (
        <div className="space-y-3">
          {courses.data.map((course) => (
            <Card key={course.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <Link to={`/mentor/courses/${course.id}`} className="font-semibold hover:underline">
                  {course.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(course.priceInCents)} · {course.salesCount} {course.salesCount === 1 ? 'aluno' : 'alunos'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={course.isPublished ? 'success' : 'default'}>{course.isPublished ? 'Publicado' : 'Rascunho'}</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/mentor/courses/${course.id}`}>Editar</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
