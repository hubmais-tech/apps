import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, MessageCircle, Search, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, getErrorMessage } from '@/lib/api'
import { initialsOf, invitationStatusMeta, toneFor, whatsappLink, type CompanyInvitation, type InvitationStatus } from '@/lib/types-company'
import { cn, formatDate } from '@/lib/utils'

type Filter = 'all' | InvitationStatus

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'sent', label: 'Enviados' },
  { id: 'accepted', label: 'Aceitos' },
  { id: 'declined', label: 'Recusados' },
  { id: 'hired', label: 'Contratados' },
  { id: 'withdrawn', label: 'Retirados' },
]

/** Dois cliques para confirmar uma ação, sem diálogo do navegador. */
function ConfirmAction({ label, confirmLabel, loading, onConfirm, tone = 'secondary' }: { label: string; confirmLabel: string; loading: boolean; onConfirm: () => void; tone?: 'secondary' | 'default' }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <Button type="button" size="sm" variant={tone} onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  }
  return (
    <span className="inline-flex gap-1.5">
      <Button type="button" size="sm" loading={loading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
        Cancelar
      </Button>
    </span>
  )
}

export function CompanyInvitationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')

  const query = useQuery({
    queryKey: ['company-invitations'],
    queryFn: async () => (await api.get<{ invitations: CompanyInvitation[] }>('/company/invitations')).data.invitations,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['company-invitations'] })
    queryClient.invalidateQueries({ queryKey: ['company-overview'] })
    queryClient.invalidateQueries({ queryKey: ['talent'] })
  }

  const withdraw = useMutation({
    mutationFn: (id: string) => api.post(`/company/invitations/${id}/withdraw`),
    onSuccess: () => {
      toast.success('Convite retirado.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })
  const hire = useMutation({
    mutationFn: (id: string) => api.post(`/company/invitations/${id}/hire`),
    onSuccess: () => {
      toast.success('Contratação registrada.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />

  const all = query.data
  const count = (id: Filter) => (id === 'all' ? all.length : all.filter((i) => i.status === id).length)
  const visible = filter === 'all' ? all : all.filter((i) => i.status === filter)

  return (
    <div>
      <PageHeader
        title="Convites enviados"
        description="Acompanhe as respostas. O contato do talento aparece depois que ele aceita."
        actions={
          <Button asChild>
            <Link to="/talents">
              <Search /> Buscar talentos
            </Link>
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState>
          <p className="mb-3">Você ainda não enviou convites. Abra o perfil de um talento e convide para uma vaga.</p>
          <Button asChild>
            <Link to="/talents">Ver o Banco de Talentos</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <div role="tablist" aria-label="Filtrar por estado" className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {filters.map((item) => {
              const selected = filter === item.id
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                    selected ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-border bg-surface hover:bg-faint',
                  )}
                >
                  {item.label} <span className="text-xs tabular opacity-70">{count(item.id)}</span>
                </button>
              )
            })}
          </div>

          {visible.length === 0 ? (
            <EmptyState>Nenhum convite neste estado.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {visible.map((invitation) => {
                const meta = invitationStatusMeta[invitation.status]
                return (
                  <li key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold', toneFor(invitation.studentId))} aria-hidden>
                      {initialsOf(invitation.studentName)}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <b className="text-[13px] font-semibold">{invitation.roleTitle}</b>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Link to={`/talents/${invitation.studentId}`} className="font-semibold text-primary hover:underline">
                          {invitation.studentName}
                        </Link>{' '}
                        · enviado em {formatDate(invitation.createdAt)}
                        {invitation.respondedAt ? ` · respondido em ${formatDate(invitation.respondedAt)}` : ''}
                      </p>
                      {invitation.contact && (
                        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
                          <a href={`mailto:${invitation.contact.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                            <Mail className="size-3.5" /> {invitation.contact.email}
                          </a>
                          {invitation.contact.phone && (
                            <a href={whatsappLink(invitation.contact.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                              <MessageCircle className="size-3.5" /> {invitation.contact.phone}
                            </a>
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {invitation.status === 'sent' && <ConfirmAction label="Retirar" confirmLabel="Confirmar retirada" loading={withdraw.isPending} onConfirm={() => withdraw.mutate(invitation.id)} />}
                      {invitation.status === 'accepted' && <ConfirmAction label="Marcar como contratado" confirmLabel="Confirmar contratação" tone="default" loading={hire.isPending} onConfirm={() => hire.mutate(invitation.id)} />}
                      {invitation.status !== 'sent' && invitation.status !== 'accepted' && (
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/talents/${invitation.studentId}`}>
                            <Send /> Ver perfil
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
