import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, FileText, MessageSquareWarning } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { formatBytes } from '@/lib/upload'
import { cn, formatDate } from '@/lib/utils'

type Review = {
  id: string
  status: 'submitted' | 'changes_requested' | 'approved'
  attempt: number
  content: string
  links: string[]
  attachments: { key: string; name: string; size: number; contentType: string; url: string }[]
  feedback: string | null
  updatedAt: string
  challengeTitle: string
  courseTitle: string
  studentName: string
}

const statusBadge = {
  submitted: { label: 'Aguardando correção', variant: 'accent' },
  changes_requested: { label: 'Ajustes pedidos', variant: 'orange' },
  approved: { label: 'Aprovada', variant: 'success' },
} as const

function ReviewCard({ review }: { review: Review }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'idle' | 'approve' | 'changes'>('idle')
  const [feedback, setFeedback] = useState('')

  const send = useMutation({
    mutationFn: (decision: 'approve' | 'request_changes') => api.post<{ certificateCode: string | null }>(`/submissions/${review.id}/review`, { decision, feedback: feedback.trim() || undefined }),
    onSuccess: ({ data }, decision) => {
      toast.success(
        decision === 'approve'
          ? data.certificateCode
            ? `Entrega aprovada. O aluno concluiu o curso e recebeu o certificado ${data.certificateCode}.`
            : 'Entrega aprovada.'
          : 'Ajustes enviados ao aluno.',
      )
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      queryClient.invalidateQueries({ queryKey: ['mentor-dashboard'] })
      setMode('idle')
      setFeedback('')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const pending = review.status === 'submitted'
  const badge = statusBadge[review.status]
  const feedbackTooShort = mode === 'changes' && feedback.trim().length < 10

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-[18px] py-3.5">
        <div className="min-w-0 leading-tight">
          <p className="text-[15px] font-semibold">{review.challengeTitle}</p>
          <p className="text-xs text-muted-foreground">
            {review.studentName} · {review.courseTitle} · tentativa {review.attempt} · {formatDate(review.updatedAt)}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="space-y-4 p-[18px]">
        <p className="text-[13px] leading-relaxed whitespace-pre-line">{review.content}</p>

        {review.links.length > 0 && (
          <ul className="space-y-1">
            {review.links.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[13px] font-medium break-all text-primary hover:underline">
                  <ExternalLink className="size-3.5 shrink-0" /> {link}
                </a>
              </li>
            ))}
          </ul>
        )}

        {review.attachments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {review.attachments.map((file) => (
              <li key={file.key}>
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border bg-faint px-2.5 py-1.5 text-xs font-medium hover:border-primary">
                  <FileText className="size-3.5 text-muted-foreground" /> {file.name} <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {review.feedback && !pending && (
          <p className={cn('rounded-lg p-3 text-[13px]', review.status === 'approved' ? 'bg-mint-soft text-success' : 'bg-sand-soft text-warning')}>
            <b className="font-semibold">Seu retorno:</b> {review.feedback}
          </p>
        )}

        {pending && mode === 'idle' && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button onClick={() => setMode('approve')}>
              <Check /> Aprovar
            </Button>
            <Button variant="secondary" onClick={() => setMode('changes')}>
              <MessageSquareWarning /> Pedir ajustes
            </Button>
          </div>
        )}

        {pending && mode !== 'idle' && (
          <div className="space-y-3 border-t border-border pt-4">
            <Field
              label={mode === 'approve' ? 'Comentário para o aluno (opcional)' : 'O que o aluno precisa ajustar?'}
              htmlFor={`feedback-${review.id}`}
              hint={mode === 'changes' ? 'Seja específico. Mínimo de 10 caracteres.' : 'Elogiar o que ficou bom ajuda o aluno a continuar.'}
            >
              <Textarea id={`feedback-${review.id}`} autoFocus value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </Field>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMode('idle')}>
                Cancelar
              </Button>
              <Button loading={send.isPending} disabled={feedbackTooShort} onClick={() => send.mutate(mode === 'approve' ? 'approve' : 'request_changes')}>
                {mode === 'approve' ? 'Confirmar aprovação' : 'Enviar ajustes'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export function MentorReviewsPage() {
  const [status, setStatus] = useState<'pending' | 'all'>('pending')

  const query = useQuery({
    queryKey: ['reviews', status],
    queryFn: async () => (await api.get<{ reviews: Review[] }>('/me/reviews', { params: { status } })).data.reviews,
  })

  return (
    <div className="max-w-3xl">
      <PageHeader title="Correções" description="Entregas dos desafios dos seus cursos. Aprovar uma entrega valida o projeto no portfólio do aluno." />

      <div role="tablist" className="mb-5 flex gap-1 border-b border-border">
        {[
          { id: 'pending', label: 'Aguardando você' },
          { id: 'all', label: 'Todas' },
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={status === tab.id}
            onClick={() => setStatus(tab.id as 'pending' | 'all')}
            className={cn('-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground', status === tab.id && 'border-primary font-semibold text-primary')}
          >
            {tab.label}
            {tab.id === 'pending' && status === 'pending' && query.data ? ` (${query.data.length})` : ''}
          </button>
        ))}
      </div>

      {query.isLoading && <Loading />}
      {query.isError && <ErrorState message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && <EmptyState>{status === 'pending' ? 'Nenhuma entrega esperando correção. Quando um aluno entregar um desafio, ele aparece aqui.' : 'Ainda não há entregas nos seus cursos.'}</EmptyState>}
      <div className="space-y-4">{query.data?.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
    </div>
  )
}
