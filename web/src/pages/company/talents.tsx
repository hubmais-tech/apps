import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Eye, GraduationCap, MapPin, SearchX, ShieldCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api } from '@/lib/api'
import { interestOptions } from '@/lib/options'
import { initialsOf, toneFor, type TalentCard, type TalentList } from '@/lib/types-company'
import { cn } from '@/lib/utils'

function TalentItem({ talent }: { talent: TalentCard }) {
  return (
    <Link
      to={`/talents/${talent.id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold', toneFor(talent.id))} aria-hidden>
          {initialsOf(talent.displayName)}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="font-heading truncate text-[15px] font-semibold">{talent.displayName}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {[talent.neighborhood, talent.city].filter(Boolean).join(', ') || 'Local não informado'}
            {talent.age ? ` · ${talent.age} anos` : ''}
          </p>
        </div>
      </div>

      <p className="min-h-5 text-[13px] font-semibold">{talent.headline ?? <span className="font-normal text-muted-foreground">Sem título no perfil</span>}</p>

      {talent.interests.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Interesses">
          {talent.interests.slice(0, 4).map((interest) => (
            <li key={interest} className="rounded-md border border-border bg-faint px-2 py-0.5 text-xs text-muted-foreground">
              {interest}
            </li>
          ))}
          {talent.interests.length > 4 && <li className="px-1 py-0.5 text-xs text-muted-foreground">+{talent.interests.length - 4}</li>}
        </ul>
      )}

      <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-success" />
          {talent.validatedProjects} {talent.validatedProjects === 1 ? 'projeto validado' : 'projetos validados'}
        </span>
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="size-3.5" />
          {talent.certificates} {talent.certificates === 1 ? 'curso' : 'cursos'}
        </span>
      </p>
    </Link>
  )
}

/** Busca de talentos (D18). Os filtros ficam na URL, então a busca pode ser compartilhada. */
export function TalentsPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const interest = params.get('interest') ?? ''
  const city = params.get('city') ?? ''
  const neighborhood = params.get('neighborhood') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  const query = useQuery({
    queryKey: ['talents', { q, interest, city, neighborhood, page }],
    placeholderData: (previous) => previous,
    queryFn: async () => (await api.get<TalentList>('/talents', { params: { q: q || undefined, interest: interest || undefined, city: city || undefined, neighborhood: neighborhood || undefined, page } })).data,
  })

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    // Qualquer mudança de filtro volta para a primeira página.
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  const hasFilters = Boolean(q || interest || city || neighborhood)
  const data = query.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div>
      <PageHeader title="Banco de Talentos" description="Jovens de Aracaju e região com cursos concluídos e projetos validados por mentores." />

      <p className="mb-5 flex gap-2.5 rounded-lg bg-primary-soft p-3 text-[13px] text-primary">
        <Eye className="mt-0.5 size-4 shrink-0" />
        Você vê o primeiro nome e a inicial do sobrenome. Nome completo e contato aparecem depois que o talento aceita seu convite.
      </p>

      <div className="mb-5 space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Buscar" htmlFor="talent-q">
            <Input id="talent-q" type="search" placeholder="Nome, título ou habilidade" value={q} onChange={(e) => update({ q: e.target.value })} />
          </Field>
          <Field label="Cidade" htmlFor="talent-city">
            <Input id="talent-city" placeholder="Ex.: Aracaju" value={city} onChange={(e) => update({ city: e.target.value })} />
          </Field>
          <Field label="Bairro" htmlFor="talent-neighborhood">
            <Input id="talent-neighborhood" placeholder="Ex.: Atalaia" value={neighborhood} onChange={(e) => update({ neighborhood: e.target.value })} />
          </Field>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-semibold">Área de interesse</p>
          <div role="group" aria-label="Área de interesse" className="flex flex-wrap gap-2">
            {interestOptions.map((option) => {
              const selected = interest === option
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ interest: selected ? '' : option })}
                  className={cn(
                    'inline-flex h-[34px] items-center rounded-full border px-3 text-[13px] font-medium transition-colors',
                    selected ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-border bg-surface hover:bg-faint',
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {query.isLoading && <Loading />}
      {query.isError && <ErrorState message="Não foi possível buscar os talentos." onRetry={() => query.refetch()} />}

      {data && data.talents.length === 0 && (
        <EmptyState>
          <span className="mb-1 flex justify-center">
            <SearchX className="size-5" />
          </span>
          {hasFilters ? (
            <p>Nenhum talento encontrado com esses filtros.</p>
          ) : (
            <p>Ainda não há talentos visíveis. Eles aparecem quando alunos concluem desafios, validam projetos com um mentor e escolhem entrar no Banco de Talentos.</p>
          )}
        </EmptyState>
      )}

      {data && data.talents.length > 0 && (
        <>
          <p className="mb-3 text-[13px] text-muted-foreground tabular" aria-live="polite">
            {data.total} {data.total === 1 ? 'talento' : 'talentos'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.talents.map((talent) => (
              <TalentItem key={talent.id} talent={talent} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                <ChevronLeft /> Anterior
              </Button>
              <span className="text-[13px] text-muted-foreground tabular">
                Página {page} de {totalPages}
              </span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => update({ page: String(page + 1) })}>
                Próxima <ChevronRight />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
