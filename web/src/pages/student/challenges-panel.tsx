import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Clock, ExternalLink, FileText, FolderKanban, Link2, Paperclip, Plus, Send, Trophy, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Dropzone } from '@/components/dropzone'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { api, getErrorMessage } from '@/lib/api'
import { challengeUploadRules, isHttpUrl, putToSignedUrl } from '@/lib/upload-career'
import { formatBytes } from '@/lib/upload'
import { cn, formatDate } from '@/lib/utils'

export type LearnChallenge = {
  id: string
  title: string
  brief: string
  criteria: string | null
  submission: { id: string; status: 'submitted' | 'changes_requested' | 'approved'; attempt: number; feedback: string | null } | null
}

type SavedAttachment = { key: string; name: string; size: number; contentType: string; url?: string }

type SubmissionDetail = {
  id: string
  status: 'submitted' | 'changes_requested' | 'approved'
  attempt: number
  content: string
  links: string[]
  attachments: (SavedAttachment & { url: string })[]
  feedback: string | null
  reviewedAt: string | null
  updatedAt: string
}

type Uploading = { id: string; name: string; size: number; progress: number; error?: string }

const MAX_ATTACHMENTS = 5
const MAX_LINKS = 5

const stateInfo = {
  todo: { label: 'Não entregue', variant: 'default', icon: AlertCircle },
  submitted: { label: 'Aguardando correção', variant: 'accent', icon: Clock },
  changes_requested: { label: 'Ajustes pedidos', variant: 'orange', icon: AlertCircle },
  approved: { label: 'Aprovado', variant: 'success', icon: CheckCircle2 },
} as const

function challengeState(challenge: LearnChallenge) {
  return challenge.submission?.status ?? 'todo'
}

function SubmissionForm({ challenge, initial, onDone, onCancel }: { challenge: LearnChallenge; initial?: SubmissionDetail; onDone: () => void; onCancel?: () => void }) {
  const [content, setContent] = useState(initial?.content ?? '')
  const [links, setLinks] = useState<string[]>(initial?.links ?? [])
  const [linkDraft, setLinkDraft] = useState('')
  const [attachments, setAttachments] = useState<SavedAttachment[]>(initial?.attachments ?? [])
  const [uploading, setUploading] = useState<Uploading[]>([])
  const aborts = useRef(new Map<string, AbortController>())
  const [touched, setTouched] = useState(false)

  const contentError = content.trim().length < 10 ? 'Conte o que você fez (mínimo de 10 caracteres).' : null
  const linkDraftError = linkDraft.trim() && !isHttpUrl(linkDraft) ? 'O link precisa começar com http:// ou https://.' : null

  function addLink() {
    const value = linkDraft.trim()
    if (!value) return
    if (!isHttpUrl(value)) return
    if (links.length >= MAX_LINKS) return toast.error(`Você pode enviar até ${MAX_LINKS} links.`)
    if (links.includes(value)) return setLinkDraft('')
    setLinks([...links, value])
    setLinkDraft('')
  }

  async function sendFile(file: File) {
    const id = crypto.randomUUID()
    const controller = new AbortController()
    aborts.current.set(id, controller)
    setUploading((list) => [...list, { id, name: file.name, size: file.size, progress: 0 }])
    try {
      const { data } = await api.post<{ uploadUrl: string; key: string }>(`/challenges/${challenge.id}/uploads`, { contentType: file.type, size: file.size })
      await putToSignedUrl({
        uploadUrl: data.uploadUrl,
        file,
        signal: controller.signal,
        onProgress: (progress) => setUploading((list) => list.map((u) => (u.id === id ? { ...u, progress } : u))),
      })
      setAttachments((list) => [...list, { key: data.key, name: file.name, size: file.size, contentType: file.type }])
      setUploading((list) => list.filter((u) => u.id !== id))
    } catch (error) {
      if (controller.signal.aborted) {
        setUploading((list) => list.filter((u) => u.id !== id))
      } else {
        setUploading((list) => list.map((u) => (u.id === id ? { ...u, error: getErrorMessage(error, 'Falha no envio do arquivo. Tente de novo.') } : u)))
      }
    } finally {
      aborts.current.delete(id)
    }
  }

  function onFiles(files: File[]) {
    const room = MAX_ATTACHMENTS - attachments.length - uploading.filter((u) => !u.error).length
    if (room <= 0) return toast.error(`Você pode anexar até ${MAX_ATTACHMENTS} arquivos.`)
    if (files.length > room) toast.error(`Só cabem mais ${room} arquivo(s). Enviamos os primeiros.`)
    files.slice(0, room).forEach((file) => void sendFile(file))
  }

  const submit = useMutation({
    mutationFn: () =>
      api.put(`/challenges/${challenge.id}/submission`, {
        content: content.trim(),
        links,
        attachments: attachments.map(({ key, name, size, contentType }) => ({ key, name, size, contentType })),
      }),
    onSuccess: () => {
      toast.success(initial ? 'Entrega reenviada para o mentor.' : 'Entrega enviada para o mentor.')
      onDone()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const busy = uploading.some((u) => !u.error)

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-faint p-4"
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        if (!contentError && !busy) submit.mutate()
      }}
    >
      <Field label="O que você fez" htmlFor={`content-${challenge.id}`} hint={`${content.trim().length} caracteres. Descreva o processo e o resultado.`}>
        <Textarea id={`content-${challenge.id}`} value={content} maxLength={5000} onChange={(e) => setContent(e.target.value)} aria-invalid={touched && Boolean(contentError)} />
        {touched && contentError && <p className="text-xs text-destructive">{contentError}</p>}
      </Field>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold">Links (opcional, até {MAX_LINKS})</p>
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
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addLink()
              }
            }}
            aria-invalid={Boolean(linkDraftError)}
          />
          <Button type="button" variant="secondary" onClick={addLink} disabled={!linkDraft.trim() || Boolean(linkDraftError)}>
            <Plus /> Adicionar
          </Button>
        </div>
        {linkDraftError && <p className="text-xs text-destructive">{linkDraftError}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold">
          Arquivos (opcional, até {MAX_ATTACHMENTS}) <span className="font-normal text-muted-foreground tabular">{attachments.length}/{MAX_ATTACHMENTS}</span>
        </p>
        {(attachments.length > 0 || uploading.length > 0) && (
          <ul className="space-y-1.5">
            {attachments.map((file) => (
              <li key={file.key} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px]">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">{formatBytes(file.size)}</span>
                <button type="button" aria-label={`Remover arquivo ${file.name}`} className="text-muted-foreground hover:text-foreground" onClick={() => setAttachments(attachments.filter((a) => a.key !== file.key))}>
                  <X className="size-4" />
                </button>
              </li>
            ))}
            {uploading.map((item) => (
              <li key={item.id} className="space-y-1.5 rounded-md border border-border bg-surface px-2.5 py-2 text-[13px]">
                <div className="flex items-center gap-2">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular">{item.error ? 'Falhou' : `${Math.round(item.progress)}%`}</span>
                  <button
                    type="button"
                    aria-label={item.error ? `Descartar ${item.name}` : `Cancelar envio de ${item.name}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => (item.error ? setUploading((list) => list.filter((u) => u.id !== item.id)) : aborts.current.get(item.id)?.abort())}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {item.error ? <p className="text-xs text-destructive">{item.error}</p> : <Progress value={item.progress} tone="primary" />}
              </li>
            ))}
          </ul>
        )}
        <Dropzone
          compact
          multiple
          accept={challengeUploadRules.accept}
          maxSize={challengeUploadRules.maxSize}
          disabled={attachments.length + uploading.filter((u) => !u.error).length >= MAX_ATTACHMENTS}
          title="Arraste arquivos aqui ou clique para escolher"
          hint={challengeUploadRules.label}
          onFiles={onFiles}
          onReject={(problems) => problems.forEach((p) => toast.error(p))}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {busy && <span className="mr-auto text-xs text-muted-foreground">Aguarde o envio dos arquivos terminar.</span>}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={submit.isPending} disabled={busy}>
          <Send /> {initial ? 'Reenviar entrega' : 'Enviar entrega'}
        </Button>
      </div>
    </form>
  )
}

function SubmissionSummary({ detail }: { detail: SubmissionDetail }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-faint p-4 text-[13px]">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Sua entrega · tentativa {detail.attempt}</span>
        <span>Atualizada em {formatDate(detail.updatedAt)}</span>
      </div>
      <p className="whitespace-pre-line">{detail.content}</p>
      {detail.links.length > 0 && (
        <ul className="space-y-1">
          {detail.links.map((link) => (
            <li key={link}>
              <a href={link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <ExternalLink className="size-3.5" /> <span className="break-all">{link}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {detail.attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {detail.attachments.map((file) => (
            <li key={file.key}>
              <a href={file.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 hover:bg-muted">
                <Paperclip className="size-3.5" /> {file.name} <span className="text-xs text-muted-foreground tabular">{formatBytes(file.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ChallengeCard({ challenge, onChanged }: { challenge: LearnChallenge; onChanged: () => void }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const state = challengeState(challenge)
  const info = stateInfo[state]

  const detail = useQuery({
    queryKey: ['submission', challenge.id, challenge.submission?.status, challenge.submission?.attempt],
    enabled: Boolean(challenge.submission),
    queryFn: async () => (await api.get<SubmissionDetail | null>(`/challenges/${challenge.id}/submission`)).data,
  })

  const toPortfolio = useMutation({
    mutationFn: () => api.post(`/me/portfolio/from-submission/${challenge.submission!.id}`),
    onSuccess: () => {
      toast.success('Projeto adicionado ao seu portfólio.')
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      if (message.includes('já está')) toast.info('Esta entrega já está no seu portfólio.')
      else toast.error(message)
    },
  })

  const done = () => {
    setEditing(false)
    queryClient.invalidateQueries({ queryKey: ['submission', challenge.id] })
    onChanged()
  }

  const showForm = state === 'todo' || state === 'changes_requested' || editing

  return (
    <article className={cn('space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5', state === 'changes_requested' && 'border-orange')} aria-label={`Desafio ${challenge.title}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
            <Trophy className="size-[18px]" />
          </span>
          <h3 className="text-base leading-snug font-bold">{challenge.title}</h3>
        </div>
        <Badge variant={info.variant}>
          <info.icon className="size-3" /> {info.label}
        </Badge>
      </header>

      <p className="max-w-[65ch] text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground">{challenge.brief}</p>
      {challenge.criteria && (
        <div className="rounded-lg bg-faint p-3 text-[13px]">
          <b className="font-semibold">Critérios de avaliação</b>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">{challenge.criteria}</p>
        </div>
      )}

      {state === 'changes_requested' && challenge.submission?.feedback && (
        <div className="space-y-1 rounded-lg border border-orange bg-orange-soft p-3 text-[13px]" role="note">
          <b className="flex items-center gap-1.5 font-semibold text-orange">
            <AlertCircle className="size-4" /> O mentor pediu ajustes
          </b>
          <p className="whitespace-pre-line">{challenge.submission.feedback}</p>
        </div>
      )}

      {state === 'approved' && (
        <div className="space-y-2 rounded-lg bg-mint-soft p-3 text-[13px]" role="status">
          <b className="flex items-center gap-1.5 font-semibold text-success">
            <CheckCircle2 className="size-4" /> Entrega aprovada
          </b>
          {challenge.submission?.feedback && <p className="whitespace-pre-line">{challenge.submission.feedback}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" loading={toPortfolio.isPending} onClick={() => toPortfolio.mutate()}>
              <FolderKanban /> Adicionar ao portfólio
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/portfolio">Ver portfólio</Link>
            </Button>
          </div>
        </div>
      )}

      {state === 'submitted' && !editing && (
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <Clock className="size-4" /> Seu mentor ainda vai corrigir. Você será avisado quando houver devolutiva.
        </p>
      )}

      {challenge.submission && detail.data && !showForm && <SubmissionSummary detail={detail.data} />}

      {showForm && (state === 'todo' || detail.data || detail.isError) && <SubmissionForm challenge={challenge} initial={detail.data ?? undefined} onDone={done} onCancel={editing ? () => setEditing(false) : undefined} />}

      {state === 'submitted' && !editing && detail.data && (
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          Editar e reenviar
        </Button>
      )}
    </article>
  )
}

export function ChallengesPanel({ challenges, onChanged }: { challenges: LearnChallenge[]; onChanged: () => void }) {
  if (challenges.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-input p-6 text-center text-[13px] text-muted-foreground">
        Este curso ainda não tem desafios. Assim que o mentor publicar um, ele aparece aqui.
      </div>
    )
  }
  return (
    <div className="space-y-4">
      {challenges.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} onChanged={onChanged} />
      ))}
    </div>
  )
}
