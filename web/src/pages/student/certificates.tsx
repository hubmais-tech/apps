import { useQuery } from '@tanstack/react-query'
import { Award, Check, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type Certificate = { code: string; issuedAt: string; courseTitle: string; courseSlug: string; mentorName: string }

export const certificateUrl = (code: string) => `${window.location.origin}/certificado/${code}`

function CertificateCard({ certificate }: { certificate: Certificate }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(certificateUrl(certificate.code))
      setCopied(true)
      toast.success('Link de validação copiado.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Abra o certificado e copie o endereço da página.')
    }
  }

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sand-soft text-warning">
          <Award className="size-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <h2 className="line-clamp-2 text-base font-bold">{certificate.courseTitle}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">com {certificate.mentorName}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-faint p-3 text-[13px]">
        <div>
          <dt className="text-xs font-semibold text-muted-foreground uppercase">Emitido em</dt>
          <dd className="tabular">{formatDate(certificate.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-muted-foreground uppercase">Código</dt>
          <dd className="font-mono text-xs select-all">{certificate.code}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <Button asChild className="flex-1">
          <Link to={`/certificado/${certificate.code}`}>
            <ExternalLink /> Ver certificado
          </Link>
        </Button>
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check /> : <Copy />} Copiar link de validação
        </Button>
      </div>
    </article>
  )
}

export function CertificatesPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => (await api.get<{ certificates: Certificate[] }>('/me/certificates')).data.certificates,
  })

  return (
    <div>
      <PageHeader title="Certificados" description="Emitidos quando você conclui todas as aulas e tem os desafios aprovados. Qualquer pessoa pode validar pelo link." />
      {isLoading && <Loading />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState>
          <p className="mb-1 font-semibold text-foreground">Você ainda não tem certificados</p>
          <p className="mb-4 max-w-md text-[13px]">Conclua as aulas de um curso e tenha os desafios aprovados pelo mentor. O certificado aparece aqui na hora.</p>
          <Button asChild>
            <Link to="/my-learning">Continuar estudando</Link>
          </Button>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((certificate) => (
            <CertificateCard key={certificate.code} certificate={certificate} />
          ))}
        </div>
      )}
    </div>
  )
}
