import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { ArrowLeft, ExternalLink, GraduationCap, Mail, MapPin, MessageCircle, Send, ShieldCheck, UserX } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { CourseCover } from '@/components/course-card'
import { ErrorState, Loading } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { goalOptions } from '@/lib/options'
import { initialsOf, invitationStatusMeta, toneFor, whatsappLink, type PortfolioItem, type TalentProfile } from '@/lib/types-company'
import { cn, formatDate } from '@/lib/utils'

function ProjectCard({ item }: { item: PortfolioItem }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card sm:flex-row">
      <div className="sm:w-56 sm:shrink-0">
        <CourseCover url={item.coverUrl} title={item.title} seed={item.id} className="h-full min-h-32 sm:aspect-auto" />
      </div>
      <div className="min-w-0 flex-1 space-y-2.5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold">{item.title}</h3>
          <Badge variant="success">
            <ShieldCheck className="size-3" /> Validado
          </Badge>
        </div>
        {item.description && <p className="line-clamp-4 text-[13px] whitespace-pre-line text-muted-foreground">{item.description}</p>}
        {item.links.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {item.links.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-64 items-center gap-1 truncate rounded-md border border-border bg-faint px-2 py-1 text-xs font-medium text-primary hover:underline">
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="truncate">{link.replace(/^https?:\/\//, '')}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Validado por <b className="font-semibold text-foreground">{item.validatedByName ?? 'um mentor'}</b>
          {item.courseTitle ? ` · ${item.courseTitle}` : ''}
          {item.validatedAt ? ` · ${formatDate(item.validatedAt)}` : ''}
        </p>
      </div>
    </article>
  )
}

/** Dois cliques para confirmar, sem diálogo do navegador. */
function ConfirmButton({ label, confirmLabel, onConfirm, loading, variant = 'secondary' }: { label: string; confirmLabel: string; onConfirm: () => void; loading?: boolean; variant?: 'secondary' | 'default' }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <Button type="button" variant={variant} className="w-full" onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  }
  return (
    <div className="flex gap-2">
      <Button type="button" className="flex-1" loading={loading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
        Cancelar
      </Button>
    </div>
  )
}

function InviteForm({ talentId, onSent }: { talentId: string; onSent: () => void }) {
  const [roleTitle, setRoleTitle] = useState('')
  const [message, setMessage] = useState('')
  const messageTooShort = message.trim().length > 0 && message.trim().length < 20

  const send = useMutation({
    mutationFn: () => api.post(`/talents/${talentId}/invitations`, { roleTitle: roleTitle.trim(), message: message.trim() }),
    onSuccess: () => {
      toast.success('Convite enviado. Avisaremos aqui quando o talento responder.')
      onSent()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (message.trim().length >= 20) send.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <Field label="Título da vaga" htmlFor="invite-role">
        <Input id="invite-role" required minLength={3} maxLength={120} placeholder="Ex.: Estágio em social media" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
      </Field>
      <Field label="Mensagem" htmlFor="invite-message" hint={`${message.trim().length}/1500. Fale da empresa, da vaga e do próximo passo (mínimo de 20 caracteres).`}>
        <Textarea id="invite-message" required maxLength={1500} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={messageTooShort} />
        {messageTooShort && <p className="text-xs text-destructive">Escreva ao menos 20 caracteres.</p>}
      </Field>
      <Button type="submit" className="w-full" loading={send.isPending} disabled={message.trim().length < 20}>
        <Send /> Enviar convite
      </Button>
    </form>
  )
}

export function TalentProfilePage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [inviting, setInviting] = useState(false)

  const query = useQuery({
    queryKey: ['talent', id],
    retry: false,
    queryFn: async () => (await api.get<TalentProfile>(`/talents/${id}`)).data,
  })

  const refresh = () => {
    setInviting(false)
    queryClient.invalidateQueries({ queryKey: ['talent', id] })
    queryClient.invalidateQueries({ queryKey: ['company-invitations'] })
    queryClient.invalidateQueries({ queryKey: ['company-overview'] })
  }
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  const withdraw = useMutation({
    mutationFn: (invitationId: string) => api.post(`/company/invitations/${invitationId}/withdraw`),
    onSuccess: () => {
      toast.success('Convite retirado.')
      refresh()
    },
    onError,
  })
  const hire = useMutation({
    mutationFn: (invitationId: string) => api.post(`/company/invitations/${invitationId}/hire`),
    onSuccess: () => {
      toast.success('Contratação registrada.')
      refresh()
    },
    onError,
  })

  if (query.isLoading) return <Loading />

  const notFound = query.error instanceof AxiosError && query.error.response?.status === 404
  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <span className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
          <UserX className="size-5" />
        </span>
        <h1 className="text-xl font-bold">Este talento não está mais disponível</h1>
        <p className="max-w-sm text-muted-foreground">O perfil pode ter sido ocultado pela pessoa. Veja outros talentos no Banco de Talentos.</p>
        <Button asChild>
          <Link to="/talents">Voltar para a busca</Link>
        </Button>
      </div>
    )
  }
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />

  const talent = query.data
  const invitation = talent.invitation
  // Um convite recusado ou retirado não bloqueia um novo convite: a API só impede enquanto houver um em andamento.
  const canInvite = !invitation || invitation.status === 'declined' || invitation.status === 'withdrawn'
  const goal = goalOptions.find((g) => g.value === talent.goal)
  const name = talent.fullName ?? talent.displayName

  return (
    <div className="space-y-5">
      <Link to="/talents" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Banco de Talentos
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6 lg:order-1">
          {talent.bio && (
            <section aria-labelledby="about-title" className="space-y-2">
              <h2 id="about-title" className="text-base font-bold">
                Sobre
              </h2>
              <p className="max-w-[65ch] leading-relaxed whitespace-pre-line text-muted-foreground">{talent.bio}</p>
            </section>
          )}

          <section aria-labelledby="portfolio-title" className="space-y-3">
            <h2 id="portfolio-title" className="flex items-center gap-2 text-base font-bold">
              Portfólio validado <Badge variant="success">{talent.portfolio.length}</Badge>
            </h2>
            <div className="space-y-3">
              {talent.portfolio.map((item) => (
                <ProjectCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          <section aria-labelledby="courses-title" className="space-y-3">
            <h2 id="courses-title" className="text-base font-bold">
              Cursos concluídos
            </h2>
            {talent.courses.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhum certificado emitido ainda.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {talent.courses.map((course, index) => (
                  <li key={`${course}-${index}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <GraduationCap className="size-4" />
                    </span>
                    <span className="text-[13px] font-semibold">{course}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="order-first lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <Card>
            <CardContent className="space-y-4 pt-[18px]">
              <div className="flex items-center gap-3">
                <span className={cn('grid size-14 shrink-0 place-items-center rounded-full text-lg font-semibold', toneFor(talent.id))} aria-hidden>
                  {initialsOf(name)}
                </span>
                <div className="min-w-0 leading-tight">
                  <h1 className="font-heading text-lg font-bold">{name}</h1>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    {[talent.neighborhood, talent.city].filter(Boolean).join(', ') || 'Local não informado'}
                    {talent.age ? ` · ${talent.age} anos` : ''}
                  </p>
                </div>
              </div>

              {talent.headline && <p className="text-[13px] font-semibold">{talent.headline}</p>}
              {goal && <p className="text-xs text-muted-foreground">Objetivo: {goal.label.toLowerCase()}.</p>}

              {talent.interests.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Interesses">
                  {talent.interests.map((interest) => (
                    <li key={interest} className="rounded-md border border-border bg-faint px-2 py-0.5 text-xs text-muted-foreground">
                      {interest}
                    </li>
                  ))}
                </ul>
              )}

              <p className="flex gap-4 border-y border-border py-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-success" /> {talent.validatedProjects} {talent.validatedProjects === 1 ? 'projeto validado' : 'projetos validados'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <GraduationCap className="size-3.5" /> {talent.certificates} {talent.certificates === 1 ? 'curso' : 'cursos'}
                </span>
              </p>

              {invitation && (
                <div className="space-y-2 rounded-lg bg-faint p-3 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{invitation.roleTitle}</span>
                    <Badge variant={invitationStatusMeta[invitation.status].variant}>{invitationStatusMeta[invitation.status].label}</Badge>
                  </div>
                  {invitation.status === 'sent' && <p className="text-xs text-muted-foreground">Aguardando a resposta do talento.</p>}
                  {invitation.status === 'declined' && <p className="text-xs text-muted-foreground">O talento recusou este convite. Você pode enviar outro.</p>}
                  {invitation.status === 'hired' && <p className="text-xs text-muted-foreground">Contratação registrada.</p>}
                </div>
              )}

              {talent.contact && (
                <div className="space-y-2 text-[13px]">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Contato</p>
                  <a href={`mailto:${talent.contact.email}`} className="flex items-center gap-2 break-all text-primary hover:underline">
                    <Mail className="size-4 shrink-0" /> {talent.contact.email}
                  </a>
                  {talent.contact.phone && (
                    <a href={whatsappLink(talent.contact.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <MessageCircle className="size-4 shrink-0" /> {talent.contact.phone} <span className="text-xs text-muted-foreground">(WhatsApp)</span>
                    </a>
                  )}
                </div>
              )}

              {invitation?.status === 'sent' && <ConfirmButton label="Retirar convite" confirmLabel="Confirmar retirada" loading={withdraw.isPending} onConfirm={() => withdraw.mutate(invitation.id)} />}
              {invitation?.status === 'accepted' && <ConfirmButton label="Marcar como contratado" confirmLabel="Confirmar contratação" variant="default" loading={hire.isPending} onConfirm={() => hire.mutate(invitation.id)} />}

              {canInvite && !inviting && (
                <Button className="w-full" onClick={() => setInviting(true)}>
                  <Send /> Convidar para vaga
                </Button>
              )}
              {canInvite && inviting && (
                <div className="space-y-3 border-t border-border pt-4">
                  <CardTitle className="text-sm">Convite para vaga</CardTitle>
                  <InviteForm talentId={talent.id} onSent={refresh} />
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setInviting(false)}>
                    Cancelar
                  </Button>
                </div>
              )}

              {!talent.contact && <p className="text-xs text-muted-foreground">O nome completo e o contato aparecem depois que o talento aceita seu convite.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

