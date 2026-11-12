import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Crown, Mail, Phone, RefreshCw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { InviteLink } from '@/components/invite-link'
import { ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { maskCnpj, maskPhone } from '@/lib/masks'
import { companySizes } from '@/lib/options'
import { companyAccessMeta, initialsOf, type AdminCompanyDetail } from '@/lib/types-company'
import { formatDate } from '@/lib/utils'

const memberStatus = {
  active: { label: 'Com acesso', variant: 'success' },
  pending: { label: 'Convite enviado', variant: 'accent' },
  expired: { label: 'Convite vencido', variant: 'destructive' },
} as const

/** Detalhe da empresa para o Hub+: equipe, convites e troca de responsável a pedido da empresa (D23). */
export function AdminCompanyDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [invite, setInvite] = useState<{ name: string; url: string } | null>(null)
  const [handing, setHanding] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const query = useQuery({
    queryKey: ['admin-company', id],
    queryFn: async () => (await api.get<AdminCompanyDetail>(`/admin/companies/${id}`)).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-company', id] })
    queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
  }

  const reissue = useMutation({
    mutationFn: async (member: { id: string; name: string }) => ({ name: member.name, url: (await api.post<{ inviteUrl: string }>(`/admin/companies/${id}/members/${member.id}/invite`)).data.inviteUrl }),
    onSuccess: (data) => {
      setInvite(data)
      toast.success('Novo convite gerado. O link anterior deixou de valer.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const handOver = useMutation({
    mutationFn: (memberId: string) => api.post(`/admin/companies/${id}/manager`, { memberId, note: note.trim() }),
    onSuccess: () => {
      setHanding(null)
      setNote('')
      toast.success('Responsável trocado e pedido registrado.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onHandOver(event: FormEvent, memberId: string) {
    event.preventDefault()
    handOver.mutate(memberId)
  }

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />

  const company = query.data
  const meta = companyAccessMeta[company.status]

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title={company.tradeName}
        description={`${maskCnpj(company.cnpj)} · ${company.city}/${company.state} · cadastrada em ${formatDate(company.createdAt)}`}
        actions={
          <Button asChild variant="ghost">
            <Link to="/admin/companies">
              <ArrowLeft /> Voltar
            </Link>
          </Button>
        }
      />

      {invite && <InviteLink url={invite.url} title={`Convite de ${invite.name}`} />}

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-muted-foreground uppercase">Razão social</dt>
              <dd>{company.legalName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground uppercase">Setor e porte</dt>
              <dd>
                {company.sector} · {companySizes.find((s) => s.value === company.size)?.label}
              </dd>
            </div>
            {company.website && (
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Site</dt>
                <dd className="break-all">{company.website}</dd>
              </div>
            )}
            {company.about && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Sobre</dt>
                <dd>{company.about}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
        </CardHeader>
        <ul>
          {company.members.map((member) => (
            <li key={member.id} className="border-t border-border first:border-t-0">
              <div className="flex flex-wrap items-center gap-3 px-[18px] py-3">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-lilac-soft text-xs font-semibold text-primary" aria-hidden>
                  {initialsOf(member.name)}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                    {member.name} {member.isPrimary && <Badge variant="primary">Responsável</Badge>}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{member.jobTitle}</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" /> {member.email}
                    </span>
                    {member.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3" /> {maskPhone(member.phone)}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={memberStatus[member.status].variant}>{memberStatus[member.status].label}</Badge>
                {member.status !== 'active' && (
                  <Button type="button" size="sm" variant="secondary" loading={reissue.isPending} onClick={() => reissue.mutate(member)}>
                    <RefreshCw /> Reenviar convite
                  </Button>
                )}
                {member.status === 'active' && !member.isPrimary && handing !== member.id && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setHanding(member.id)}>
                    <Crown /> Indicar como responsável
                  </Button>
                )}
              </div>
              {handing === member.id && (
                <form onSubmit={(e) => onHandOver(e, member.id)} className="space-y-3 border-t border-border bg-faint px-[18px] py-3.5">
                  <Field label="Quem da empresa pediu a troca e por quê" htmlFor="handover-note" hint="Fica registrado no histórico. Use quando o responsável atual saiu da empresa e não pode passar a gestão sozinho.">
                    <Textarea id="handover-note" required minLength={5} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                  </Field>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setHanding(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" loading={handOver.isPending} disabled={note.trim().length < 5}>
                      Confirmar troca
                    </Button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {company.managerChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de responsáveis</CardTitle>
          </CardHeader>
          <ul>
            {company.managerChanges.map((change) => (
              <li key={change.id} className="space-y-0.5 border-t border-border px-[18px] py-3 text-[13px] first:border-t-0">
                <p>
                  <b className="font-semibold">{change.fromName ?? 'Sem responsável'}</b> → <b className="font-semibold">{change.toName ?? 'Pessoa removida'}</b>
                  <span className="text-muted-foreground"> · {formatDate(change.createdAt)} · {change.origin === 'admin' ? 'indicado pelo Hub+' : 'passado pela própria empresa'}</span>
                </p>
                {change.note && <p className="text-xs text-muted-foreground">Pedido registrado: {change.note}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
