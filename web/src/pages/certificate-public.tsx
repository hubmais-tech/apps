import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BadgeCheck, Printer, SearchX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Logo } from '@/components/logo'
import { Loading } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type PublicCertificate = {
  code: string
  issuedAt: string
  studentName: string
  courseTitle: string
  mentorName: string
  totalHours: number
  lessonsCount: number
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatHours(hours: number) {
  if (hours <= 0) return null
  return hours < 1 ? `${Math.round(hours * 60)} minutos de conteúdo` : `${String(hours).replace('.', ',')} ${hours === 1 ? 'hora' : 'horas'} de conteúdo`
}

/** Página pública e imprimível do certificado. Serve também para validar o código. */
export function CertificatePublicPage() {
  const { code = '' } = useParams()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['certificate', code],
    retry: false,
    queryFn: async () => (await api.get<PublicCertificate>(`/certificates/${code}`)).data,
  })

  if (isLoading) return <Loading />

  if (isError || !data) {
    const notFound = error instanceof AxiosError && error.response?.status === 404
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/12 text-destructive">
          <SearchX className="size-6" />
        </span>
        <h1 className="text-2xl font-bold">{notFound ? 'Certificado não encontrado' : 'Não foi possível validar agora'}</h1>
        <p className="text-muted-foreground">
          {notFound ? (
            <>
              Não existe nenhum certificado com o código <b className="font-mono text-foreground">{code.toUpperCase()}</b>. Confira se o código foi digitado corretamente.
            </>
          ) : (
            'Tente de novo em instantes.'
          )}
        </p>
        <Button variant="secondary" asChild>
          <Link to="/">Ir para o Hub+</Link>
        </Button>
      </div>
    )
  }

  const hours = formatHours(data.totalHours)

  return (
    <div className="certificate-page space-y-5">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          .certificate-sheet, .certificate-sheet * { visibility: visible; }
          .certificate-sheet { position: fixed; inset: 0; width: 100vw; height: 100vh; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <BadgeCheck className="size-4 text-success" /> Este certificado foi emitido pelo Hub+ e o código abaixo confirma que ele é verdadeiro.
        </div>
        <Button onClick={() => window.print()}>
          <Printer /> Imprimir ou salvar em PDF
        </Button>
      </div>

      <article
        className="certificate-sheet relative mx-auto flex aspect-[1.414/1] w-full max-w-4xl flex-col items-center justify-between overflow-hidden rounded-xl border border-border bg-white p-6 text-center text-[#17141f] sm:p-12"
        aria-label={`Certificado de ${data.studentName}`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-3 rounded-lg border-2 border-[#5900b0]/70 sm:inset-5" />
        <div aria-hidden className="pointer-events-none absolute inset-5 rounded-md border border-[#f26303]/50 sm:inset-8" />

        <header className="relative flex flex-col items-center gap-2">
          <Logo />
          <p className="text-[10px] font-semibold tracking-[0.3em] text-[#6e6880] uppercase sm:text-xs">Hub Juventude+</p>
        </header>

        <div className="relative space-y-3 sm:space-y-4">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-[#5900b0] uppercase sm:text-sm">Certificado de conclusão</p>
          <h1 className="font-heading text-2xl leading-tight font-bold sm:text-5xl">{data.studentName}</h1>
          <p className="mx-auto max-w-xl text-[11px] leading-relaxed text-[#4b455a] sm:text-base">
            concluiu o curso <b className="font-semibold text-[#17141f]">{data.courseTitle}</b>
            {hours ? `, com ${hours}` : ''}
            {data.lessonsCount > 0 ? ` em ${data.lessonsCount} ${data.lessonsCount === 1 ? 'aula' : 'aulas'}` : ''}, sob a mentoria de {data.mentorName}, cumprindo todas as aulas e desafios práticos.
          </p>
        </div>

        <footer className="relative grid w-full grid-cols-3 items-end gap-2 text-[9px] sm:text-xs">
          <div className="space-y-0.5 text-left">
            <p className="font-semibold tracking-wide text-[#6e6880] uppercase">Emitido em</p>
            <p className="text-[11px] font-semibold sm:text-sm">{formatLongDate(data.issuedAt)}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ddf3ea] px-2.5 py-1 font-semibold text-[#15803d] sm:px-3 sm:text-xs">
              <BadgeCheck className="size-3 sm:size-4" /> Certificado válido
            </span>
          </div>
          <div className="space-y-0.5 text-right">
            <p className="font-semibold tracking-wide text-[#6e6880] uppercase">Código de verificação</p>
            <p className="font-mono text-[11px] font-semibold sm:text-sm">{data.code}</p>
          </div>
        </footer>
      </article>

      <p className="no-print text-center text-xs text-muted-foreground">Para validar, abra {window.location.origin}/certificado/{data.code}</p>
    </div>
  )
}
