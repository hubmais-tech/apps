import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Briefcase, CheckCircle2, Clock, Handshake, Search, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState, ErrorState, Loading, Stat } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type Company } from '@/lib/api'
import { initialsOf, invitationStatusMeta, toneFor, type CompanyInvitation, type CompanyOverview } from '@/lib/types-company'
import { cn, formatDate } from '@/lib/utils'

const memberStatus = {
  active: { label: 'Com acesso', variant: 'success' },
  pending: { label: 'Convite enviado', variant: 'accent' },
  expired: { label: 'Convite vencido', variant: 'destructive' },
} as const

/** Painel da empresa, exibido em "/" para o perfil empresa. */
export function CompanyDashboard() {
  const company = useQuery({ queryKey: ['company'], queryFn: async () => (await api.get<Company>('/company')).data })
  const overview = useQuery({ queryKey: ['company-overview'], queryFn: async () => (await api.get<CompanyOverview>('/company/overview')).data })
  const invitations = useQuery({
    queryKey: ['company-invitations'],
    queryFn: async () => (await api.get<{ invitations: CompanyInvitation[] }>('/company/invitations')).data.invitations,
  })

  if (company.isLoading || overview.isLoading || invitations.isLoading) return <Loading />
  if (company.isError || overview.isError || invitations.isError || !company.data || !overview.data || !invitations.data) {
    return (
      <ErrorState
        onRetry={() => {
          company.refetch()
          overview.refetch()
          invitations.refetch()
        }}
      />
    )
  }

  const { tradeName, members } = company.data
  const { talentsAvailable, invitations: counts } = overview.data
  const recent = invitations.data.slice(0, 5)

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="flex flex-wrap items-end justify-between gap-3 lg:col-span-12">
        <div>
          <h1 className="text-2xl font-bold">{tradeName}</h1>
          <p className="text-muted-foreground">Encontre jovens com projetos validados por mentores e convide para suas vagas.</p>
        </div>
        <Button asChild>
          <Link to="/talents">
            <Search /> Buscar talentos
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:col-span-12 lg:grid-cols-4 lg:gap-4">
        <Stat label="Talentos disponíveis" value={talentsAvailable} icon={Users} hint={talentsAvailable ? 'Com projeto validado' : 'Ainda não há talentos visíveis'} />
        <Stat label="Aguardando resposta" value={counts.sent} icon={Clock} tone="warning" hint="Convites enviados" />
        <Stat label="Convites aceitos" value={counts.accepted} icon={CheckCircle2} tone="success" hint={counts.declined ? `${counts.declined} recusado${counts.declined === 1 ? '' : 's'}` : 'Contato liberado'} />
        <Stat label="Contratados" value={counts.hired} icon={Handshake} tone="orange" hint="Registrados por você" />
      </div>

      <div className="space-y-5 lg:col-span-8">
        <Card>
          <CardHeader>
            <CardTitle>Últimos convites</CardTitle>
            <Link to="/company/invitations" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
              Ver todos <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          {recent.length === 0 ? (
            <div className="p-[18px]">
              {talentsAvailable === 0 ? (
                <EmptyState className="border-0 py-6">Os primeiros talentos aparecem quando alunos concluírem desafios e validarem projetos com um mentor.</EmptyState>
              ) : (
                <EmptyState className="border-0 py-6">
                  <p className="mb-3">Você ainda não enviou convites.</p>
                  <Button asChild>
                    <Link to="/talents">Ver talentos</Link>
                  </Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <ul>
              {recent.map((invitation) => {
                const meta = invitationStatusMeta[invitation.status]
                return (
                  <li key={invitation.id} className="border-t border-border first:border-t-0">
                    <Link to={`/talents/${invitation.studentId}`} className="flex items-center gap-3 px-[18px] py-3 hover:bg-faint">
                      <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-full text-xs font-semibold', toneFor(invitation.studentId))} aria-hidden>
                        {initialsOf(invitation.studentName)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <b className="block truncate text-[13px] font-semibold">{invitation.roleTitle}</b>
                        <span className="text-xs text-muted-foreground">
                          {invitation.studentName} · {formatDate(invitation.createdAt)}
                        </span>
                      </span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-5 lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <Link to="/settings?tab=team" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline">
              Gerenciar <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <ul>
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-lilac-soft text-xs font-semibold text-primary" aria-hidden>
                  {initialsOf(member.name)}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[13px] font-semibold">{member.name}</b>
                  <span className="block truncate text-xs text-muted-foreground">{member.jobTitle}</span>
                </span>
                <Badge variant={member.isPrimary ? 'primary' : memberStatus[member.status].variant}>{member.isPrimary ? 'Principal' : memberStatus[member.status].label}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex gap-3 p-[18px]">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
              <Briefcase className="size-[18px]" />
            </span>
            <div className="text-[13px]">
              <b className="font-semibold">Como funciona o convite</b>
              <p className="mt-1 text-muted-foreground">Você convida para uma vaga. Se o talento aceitar, o nome completo e o contato ficam visíveis para a sua empresa.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
