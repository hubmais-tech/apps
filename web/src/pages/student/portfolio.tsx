import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Briefcase, Eye, EyeOff, ExternalLink, FolderKanban, ImageIcon, Link2, Pencil, Plus, ShieldCheck, Trash2, Trophy, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Dropzone } from '@/components/dropzone'
import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { api, getErrorMessage } from '@/lib/api'
import { isHttpUrl, portfolioCoverRules, putToSignedUrl } from '@/lib/upload-career'
import { cn, formatDate } from '@/lib/utils'

type PortfolioItem = {
  id: string
  title: string
  description: string | null
  links: string[]
  coverUrl: string | null
  isPublic: boolean
  validated: boolean
  validatedByName: string | null
  validatedAt: string | null
  courseTitle: string | null
}

type TalentStatus = { visible: boolean; validatedProjects: number; eligible: boolean; hasHeadline: boolean }

type LearnForPortfolio = {
  course: { title: string }
  challenges: { id: string; title: string; submission: { id: string; status: string } | null }[]
}

const MAX_LINKS = 5

// ---------- Remoção em dois cliques ----------
function ConfirmRemove({ label, loading, onConfirm }: { label: string; loading?: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  if (asking) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button type="button" size="sm" variant="destructive" loading={loading} onClick={onConfirm}>
          Remover
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAsking(false)}>
          Cancelar
        </Button>
      </span>
    )
  }
  return (
    <Button type="button" size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Remover ${label}`} onClick={() => setAsking(true)}>
      <Trash2 /> Remover
    </Button>
  )
}

// ---------- Formulário de projeto (novo ou edição) ----------
function ItemForm({ initial, onDone, onCancel }: { initial?: PortfolioItem; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [links, setLinks] = useState<string[]>(initial?.links ?? [])
  const [linkDraft, setLinkDraft] = useState('')
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true)
  // undefined = capa não mudou; string = nova capa; null = removida.
  const [coverKey, setCoverKey] = useState<string | null | undefined>(undefined)
  const [preview, setPreview] = useState<string | null>(initial?.coverUrl ?? null)
  const [progress, setProgress] = useState<number | null>(null)
  const [touched, setTouched] = useState(false)

  const titleError = title.trim().length < 3 ? 'Dê um título com pelo menos 3 letras.' : null
  const linkError = linkDraft.trim() && !isHttpUrl(linkDraft) ? 'O link precisa começar com http:// ou https://.' : null

  function addLink() {
    const value = linkDraft.trim()
    if (!value || !isHttpUrl(value)) return
    if (links.length >= MAX_LINKS) return toast.error(`Você pode adicionar até ${MAX_LINKS} links.`)
    if (!links.includes(value)) setLinks([...links, value])
    setLinkDraft('')
  }

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      const { data } = await api.post<{ uploadUrl: string; key: string }>('/me/portfolio/uploads', { contentType: file.type, size: file.size })
      await putToSignedUrl({ uploadUrl: data.uploadUrl, file, onProgress: setProgress })
      return { key: data.key, preview: URL.createObjectURL(file) }
    },
    onSuccess: (result) => {
      setCoverKey(result.key)
      setPreview(result.preview)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Falha no envio da imagem. Tente de novo.')),
    onSettled: () => setProgress(null),
  })

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        links,
        isPublic,
        ...(coverKey !== undefined ? { coverKey } : {}),
      }
      return initial ? api.patch(`/me/portfolio/${initial.id}`, body) : api.post('/me/portfolio', body)
    },
    onSuccess: () => {
      toast.success(initial ? 'Projeto atualizado.' : 'Projeto adicionado ao portfólio.')
      onDone()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!titleError && !uploadCover.isPending) save.mutate()
  }

  const idSuffix = initial?.id ?? 'novo'

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5" aria-label={initial ? `Editar projeto ${initial.title}` : 'Novo projeto'}>
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <Field label="Título do projeto" htmlFor={`pt-title-${idSuffix}`}>
            <Input id={`pt-title-${idSuffix}`} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-invalid={touched && Boolean(titleError)} />
            {touched && titleError && <p className="text-xs text-destructive">{titleError}</p>}
          </Field>
          <Field label="Descrição" htmlFor={`pt-desc-${idSuffix}`} hint={`${description.length}/1500 caracteres. Conte o problema, o que você fez e o resultado.`}>
            <Textarea id={`pt-desc-${idSuffix}`} value={description} maxLength={1500} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Links (até {MAX_LINKS})</p>
            {links.length > 0 && (
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px]">
                    <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{link}</span>
                    <button type="button" aria-label={`Remover link ${link}`} className="text-muted-foreground hover:text-foreground" onClick={() => setLinks(links.filter((l) => l !== link))}>
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                aria-label="Novo link"
                inputMode="url"
                placeholder="https://"
                value={linkDraft}
                aria-invalid={Boolean(linkError)}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLink()
                  }
                }}
              />
              <Button type="button" variant="secondary" disabled={!linkDraft.trim() || Boolean(linkError)} onClick={addLink}>
                <Plus /> Adicionar
              </Button>
            </div>
            {linkError && <p className="text-xs text-destructive">{linkError}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-semibold">Imagem de capa</p>
          {preview && (
            <div className="relative overflow-hidden rounded-lg border border-border">
              <img src={preview} alt="Prévia da capa do projeto" className="aspect-video w-full object-cover" />
              <button
                type="button"
                aria-label="Remover capa"
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-md bg-black/60 text-white hover:bg-black/80"
                onClick={() => {
                  setPreview(null)
                  setCoverKey(null)
                }}
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          <Dropzone
            compact
            accept={portfolioCoverRules.accept}
            maxSize={portfolioCoverRules.maxSize}
            disabled={uploadCover.isPending}
            title={preview ? 'Trocar imagem' : 'Arraste a imagem ou clique'}
            hint={portfolioCoverRules.label}
            icon={<ImageIcon className="size-4" />}
            onFiles={([file]) => file && uploadCover.mutate(file)}
            onReject={(problems) => problems.forEach((p) => toast.error(p))}
          />
          {progress !== null && <Progress value={progress} tone="primary" />}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
        <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        <span>
          <b className="font-semibold">Mostrar no meu perfil público.</b> <span className="text-muted-foreground">Projetos ocultos não contam para o Banco de Talentos.</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending} disabled={uploadCover.isPending}>
          {initial ? 'Salvar projeto' : 'Adicionar projeto'}
        </Button>
      </div>
    </form>
  )
}

// ---------- Cartão de projeto ----------
function ItemCard({ item, onChanged }: { item: PortfolioItem; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)

  const toggle = useMutation({
    mutationFn: () => api.patch(`/me/portfolio/${item.id}`, { isPublic: !item.isPublic }),
    onSuccess: () => {
      toast.success(item.isPublic ? 'Projeto oculto do perfil.' : 'Projeto visível no perfil.')
      onChanged()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/me/portfolio/${item.id}`),
    onSuccess: () => {
      toast.success('Projeto removido.')
      onChanged()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (editing) {
    return (
      <div className="sm:col-span-2 lg:col-span-3">
        <ItemForm
          initial={item}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false)
            onChanged()
          }}
        />
      </div>
    )
  }

  return (
    <article className={cn('flex flex-col overflow-hidden rounded-xl border border-border bg-card', !item.isPublic && 'opacity-80')}>
      {item.coverUrl ? (
        <img src={item.coverUrl} alt={`Capa do projeto ${item.title}`} className="aspect-video w-full object-cover" loading="lazy" />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-lilac-soft text-primary" role="img" aria-label="Projeto sem capa">
          <FolderKanban className="size-9 opacity-60" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.validated ? (
            <Badge variant="success">
              <BadgeCheck className="size-3" /> Validado{item.validatedByName ? ` por ${item.validatedByName}` : ''}
            </Badge>
          ) : (
            <Badge>Sem validação</Badge>
          )}
          {!item.isPublic && (
            <Badge variant="accent">
              <EyeOff className="size-3" /> Oculto
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-[15px] leading-snug font-semibold">{item.title}</h3>
          {item.courseTitle && <p className="text-xs text-muted-foreground">Desafio do curso {item.courseTitle}</p>}
          {item.validatedAt && <p className="text-xs text-muted-foreground tabular">Validado em {formatDate(item.validatedAt)}</p>}
        </div>
        {item.description && <p className="line-clamp-4 text-[13px] whitespace-pre-line text-muted-foreground">{item.description}</p>}
        {item.links.length > 0 && (
          <ul className="space-y-1">
            {item.links.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1.5 text-[13px] text-primary hover:underline">
                  <ExternalLink className="size-3.5 shrink-0" /> <span className="truncate">{link}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border pt-3">
          <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
            <Pencil /> Editar
          </Button>
          <Button type="button" size="sm" variant="ghost" loading={toggle.isPending} onClick={() => toggle.mutate()}>
            {item.isPublic ? <EyeOff /> : <Eye />} {item.isPublic ? 'Ocultar' : 'Mostrar'}
          </Button>
          <span className="ml-auto">
            <ConfirmRemove label={item.title} loading={remove.isPending} onConfirm={() => remove.mutate()} />
          </span>
        </div>
      </div>
    </article>
  )
}

// ---------- Banco de Talentos ----------
function TalentBlock({ validatedCount }: { validatedCount: number }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['talent'],
    queryFn: async () => (await api.get<TalentStatus>('/me/talent')).data,
  })

  const toggle = useMutation({
    mutationFn: (visible: boolean) => api.put('/me/talent', { visible }),
    onSuccess: (_data, visible) => {
      toast.success(visible ? 'Você agora aparece para empresas no Banco de Talentos.' : 'Você saiu do Banco de Talentos.')
      queryClient.invalidateQueries({ queryKey: ['talent'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const eligible = data?.eligible ?? validatedCount > 0
  const visible = data?.visible ?? false

  return (
    <section aria-labelledby="talent-title" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', visible ? 'bg-mint-soft text-success' : 'bg-orange-soft text-orange')}>
            <Briefcase className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 id="talent-title" className="flex flex-wrap items-center gap-2 text-base font-bold">
              Banco de Talentos {visible ? <Badge variant="success">Você está visível</Badge> : <Badge>Fora do Banco</Badge>}
            </h2>
            <p className="text-[13px] text-muted-foreground tabular">
              {data?.validatedProjects ?? validatedCount} {(data?.validatedProjects ?? validatedCount) === 1 ? 'projeto validado' : 'projetos validados'} e públicos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span id="talent-switch-label" className="text-[13px] font-semibold">
            Aparecer para empresas
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-labelledby="talent-switch-label"
            disabled={toggle.isPending || (!eligible && !visible)}
            onClick={() => toggle.mutate(!visible)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-55',
              visible ? 'bg-primary' : 'bg-input',
            )}
          >
            <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', visible && 'translate-x-5')} />
          </button>
        </div>
      </div>

      {!eligible && (
        <p className="mt-4 flex gap-2 rounded-lg bg-sand-soft p-3 text-[13px] text-warning" role="note">
          <Trophy className="mt-0.5 size-4 shrink-0" />
          <span>
            Você precisa de <b className="font-semibold">pelo menos 1 projeto validado</b> por um mentor. Entregue um desafio de curso e, quando o mentor aprovar, adicione o projeto aqui.
          </span>
        </p>
      )}

      <ul className="mt-4 grid gap-2 text-[13px] text-muted-foreground sm:grid-cols-3">
        <li className="flex gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" /> Só aparece quem escolhe e tem projeto validado e público.
        </li>
        <li className="flex gap-2">
          <Eye className="mt-0.5 size-4 shrink-0 text-success" /> Empresas veem seu primeiro nome e a inicial do sobrenome.
        </li>
        <li className="flex gap-2">
          <Briefcase className="mt-0.5 size-4 shrink-0 text-success" /> Nome completo e contato só depois que você aceita um convite.
        </li>
      </ul>
      {data && !data.hasHeadline && eligible && (
        <p className="mt-3 text-xs text-muted-foreground">
          Dica: defina um título para o seu perfil em <Link to="/settings" className="font-semibold text-primary hover:underline">Configurações</Link>. Perfis com título são mais fáceis de encontrar.
        </p>
      )}
    </section>
  )
}

// ---------- Entregas aprovadas ----------
type Approved = { submissionId: string; challengeTitle: string; courseTitle: string }

function ApprovedSubmissions({ items, onAdded }: { items: PortfolioItem[]; onAdded: () => void }) {
  const queryClient = useQueryClient()
  const enrollments = useQuery({
    queryKey: ['enrollments'],
    queryFn: async () => (await api.get<{ enrollments: { slug: string }[] }>('/me/enrollments')).data.enrollments,
  })

  const learns = useQueries({
    queries: (enrollments.data ?? []).map((e) => ({
      queryKey: ['learn', e.slug],
      queryFn: async () => (await api.get<LearnForPortfolio>(`/courses/${e.slug}/learn`)).data,
    })),
  })

  const [added, setAdded] = useState<Set<string>>(new Set())

  const approved: Approved[] = learns.flatMap((q) =>
    (q.data?.challenges ?? []).flatMap((c) => (c.submission?.status === 'approved' ? [{ submissionId: c.submission.id, challengeTitle: c.title, courseTitle: q.data!.course.title }] : [])),
  )
  // Um item validado com o mesmo título e curso quase certamente é essa entrega. Se não for, a API responde 409.
  const pending = approved.filter((a) => !added.has(a.submissionId) && !items.some((i) => i.validated && i.title === a.challengeTitle && i.courseTitle === a.courseTitle))

  const add = useMutation({
    mutationFn: (submissionId: string) => api.post(`/me/portfolio/from-submission/${submissionId}`),
    onSuccess: (_data, submissionId) => {
      toast.success('Projeto validado adicionado ao portfólio.')
      setAdded((set) => new Set(set).add(submissionId))
      queryClient.invalidateQueries({ queryKey: ['talent'] })
      onAdded()
    },
    onError: (error, submissionId) => {
      const message = getErrorMessage(error)
      if (message.includes('já está')) {
        toast.info('Esta entrega já está no seu portfólio.')
        setAdded((set) => new Set(set).add(submissionId))
      } else {
        toast.error(message)
      }
    },
  })

  if (pending.length === 0) return null

  return (
    <section aria-labelledby="approved-title" className="space-y-3 rounded-xl border border-success bg-mint-soft p-5">
      <div className="space-y-0.5">
        <h2 id="approved-title" className="flex items-center gap-2 text-base font-bold">
          <BadgeCheck className="size-5 text-success" /> Entregas aprovadas para o portfólio
        </h2>
        <p className="text-[13px] text-muted-foreground">Seu mentor aprovou estes desafios. Adicione ao portfólio para contar como projeto validado.</p>
      </div>
      <ul className="space-y-2">
        {pending.map((entry) => (
          <li key={entry.submissionId} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-semibold">{entry.challengeTitle}</p>
              <p className="text-xs text-muted-foreground">{entry.courseTitle}</p>
            </div>
            <Button size="sm" loading={add.isPending && add.variables === entry.submissionId} onClick={() => add.mutate(entry.submissionId)}>
              <Plus /> Adicionar ao portfólio
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PortfolioPage() {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => (await api.get<{ items: PortfolioItem[] }>('/me/portfolio')).data.items,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    queryClient.invalidateQueries({ queryKey: ['talent'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const validatedCount = data?.filter((i) => i.validated && i.isPublic).length ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Portfólio"
        description="Seus projetos. Os validados por mentores abrem as portas do Banco de Talentos."
        actions={
          !adding && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> Adicionar projeto
            </Button>
          )
        }
      />

      {isLoading && <Loading />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {data && (
        <>
          <TalentBlock validatedCount={validatedCount} />
          <ApprovedSubmissions items={data} onAdded={refresh} />

          {adding && (
            <ItemForm
              onCancel={() => setAdding(false)}
              onDone={() => {
                setAdding(false)
                refresh()
              }}
            />
          )}

          {data.length === 0 && !adding && (
            <EmptyState>
              <p className="mb-1 font-semibold text-foreground">Seu portfólio está vazio</p>
              <p className="mb-4 max-w-md text-[13px]">Entregue os desafios dos cursos para ganhar projetos validados, ou adicione um projeto seu.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/my-learning">Ver meus cursos</Link>
                </Button>
                <Button variant="secondary" onClick={() => setAdding(true)}>
                  <Plus /> Adicionar projeto
                </Button>
              </div>
            </EmptyState>
          )}

          {data.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((item) => (
                <ItemCard key={item.id} item={item} onChanged={refresh} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
