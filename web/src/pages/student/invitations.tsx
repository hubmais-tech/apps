import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Building2, Check, Eye, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type Invitation = {
  id: string
  companyName: string
  companySector: string
  companyCity: string
  companyAbout: string | null
  roleTitle: string
  message: string
  status: 'sent' | 'accepted' | 'declined' | 'hired' | 'withdrawn'
  createdAt: string
}

const status = {
  sent: { label: 'Aguardando sua resposta', variant: 'accent' },
  accepted: { label: 'Você aceitou', variant: 'success' },
  declined: { label: 'Você recusou', variant: 'default' },
  hired: { label: 'Contratado', variant: 'primary' },
  withdrawn: { label: 'Retirado', variant: 'default' },
} as const

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const queryClient = useQueryClient()

  const respond = useMutation({
    mutationFn: (accept: boolean) => api.post(`/me/invitations/${invitation.id}/respond`, { accept }),
    onSuccess: (_data, accept) => {
      toast.success(accept ? 'Convite aceito. A empresa já pode ver seu nome completo e contato.' : 'Convite recusado.')
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const info = status[invitation.status]

  return (
    <article className="space-y-4 rounded-xl border border-border bg-card p-5" aria-label={`Convite de ${invitation.companyName}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <h2 className="text-base font-bold">{invitation.companyName}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{invitation.companySector}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {invitation.companyCity}
              </span>
              <span className="tabular">Enviado em {formatDate(invitation.createdAt)}</span>
            </p>
          </div>
        </div>
        <Badge variant={info.variant}>{info.label}</Badge>
      </header>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Briefcase className="size-4 text-orange" /> {invitation.roleTitle}
        </p>
        <p className="max-w-[65ch] rounded-lg bg-faint p-3 text-[13px] leading-relaxed whitespace-pre-line">{invitation.message}</p>
        {invitation.companyAbout && (
          <details className="text-[13px]">
            <summary className="cursor-pointer font-semibold text-primary">Sobre a empresa</summary>
            <p className="mt-1.5 max-w-[65ch] whitespace-pre-line text-muted-foreground">{invitation.companyAbout}</p>
          </details>
        )}
      </div>

      {invitation.status === 'sent' && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="flex gap-2 text-xs text-muted-foreground">
            <Eye className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Ao <b className="font-semibold text-foreground">aceitar</b>, a empresa passa a ver seu <b className="font-semibold text-foreground">nome completo, e-mail e WhatsApp</b> para conversar com você. Se recusar, nada é revelado.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button loading={respond.isPending && respond.variables === true} disabled={respond.isPending} onClick={() => respond.mutate(true)}>
              <Check /> Aceitar convite
            </Button>
            <Button variant="secondary" loading={respond.isPending && respond.variables === false} disabled={respond.isPending} onClick={() => respond.mutate(false)}>
              <X /> Recusar
            </Button>
          </div>
        </div>
      )}

      {(invitation.status === 'accepted' || invitation.status === 'hired') && (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">A empresa já tem acesso ao seu contato. Fique de olho no e-mail e no WhatsApp.</p>
      )}
    </article>
  )
}

export function StudentInvitationsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => (await api.get<{ invitations: Invitation[] }>('/me/invitations')).data.invitations,
  })

  const pending = data?.filter((i) => i.status === 'sent').length ?? 0

  return (
    <div className="max-w-3xl">
      <PageHeader title="Convites" description={pending ? `${pending} ${pending === 1 ? 'convite aguardando' : 'convites aguardando'} sua resposta.` : 'Empresas que querem conversar com você aparecem aqui.'} />
      {isLoading && <Loading />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState>
          <p className="mb-1 font-semibold text-foreground">Nenhum convite por enquanto</p>
          <p className="max-w-md text-[13px]">Empresas só encontram você no Banco de Talentos depois que você tem um projeto validado por um mentor e escolhe aparecer. Veja como em Portfólio.</p>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="space-y-4">
          {data.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} />
          ))}
        </div>
      )}
    </div>
  )
}
