import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CourseCard } from '@/components/course-card'
import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, type CourseSummary } from '@/lib/api'

const priceRanges = [
  { value: 'all', label: 'Qualquer valor', test: () => true },
  { value: 'upto100', label: 'Até R$ 100', test: (cents: number) => cents <= 10000 },
  { value: '100to200', label: 'R$ 100 a R$ 200', test: (cents: number) => cents > 10000 && cents <= 20000 },
  { value: 'over200', label: 'Acima de R$ 200', test: (cents: number) => cents > 20000 },
] as const

const sorters = {
  recent: { label: 'Mais recentes', fn: () => 0 },
  priceAsc: { label: 'Menor preço', fn: (a: CourseSummary, b: CourseSummary) => a.priceInCents - b.priceInCents },
  priceDesc: { label: 'Maior preço', fn: (a: CourseSummary, b: CourseSummary) => b.priceInCents - a.priceInCents },
  title: { label: 'Ordem alfabética', fn: (a: CourseSummary, b: CourseSummary) => a.title.localeCompare(b.title, 'pt-BR') },
} as const

type SortKey = keyof typeof sorters

/** Catálogo público. Busca, preço e ordem ficam na URL, então o link da busca pode ser compartilhado. */
export function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const price = params.get('price') ?? 'all'
  const sort = (params.get('sort') as SortKey | null) ?? 'recent'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => (await api.get<{ courses: CourseSummary[] }>('/courses')).data.courses,
  })

  function update(key: string, value: string, fallback: string) {
    const next = new URLSearchParams(params)
    if (value && value !== fallback) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const term = q.trim().toLowerCase()
    const range = priceRanges.find((p) => p.value === price) ?? priceRanges[0]
    return data
      .filter((c) => (term ? `${c.title} ${c.mentorName}`.toLowerCase().includes(term) : true))
      .filter((c) => range.test(c.priceInCents))
      .sort(sorters[sort in sorters ? sort : 'recent'].fn)
  }, [data, q, price, sort])

  const hasFilters = Boolean(q) || price !== 'all'

  return (
    <div>
      <PageHeader title="Explorar cursos" description={data ? `${data.length} ${data.length === 1 ? 'curso disponível' : 'cursos disponíveis'}, curtos e com mentores de verdade.` : 'Cursos curtos, com mentores de verdade.'} />

      <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_200px_200px_auto] sm:items-end">
        <Field label="Buscar" htmlFor="q">
          <Input id="q" type="search" placeholder="Nome do curso ou do mentor" value={q} onChange={(e) => update('q', e.target.value, '')} />
        </Field>
        <Field label="Preço" htmlFor="price">
          <Select id="price" value={price} onChange={(e) => update('price', e.target.value, 'all')}>
            {priceRanges.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ordenar por" htmlFor="sort">
          <Select id="sort" value={sort} onChange={(e) => update('sort', e.target.value, 'recent')}>
            {(Object.keys(sorters) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {sorters[key].label}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="secondary" disabled={!hasFilters} onClick={() => setParams({}, { replace: true })}>
          <SlidersHorizontal /> Limpar
        </Button>
      </div>

      {isLoading && <Loading />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState>Os primeiros cursos estão chegando. Volte em breve.</EmptyState>}
      {data && data.length > 0 && filtered.length === 0 && <EmptyState>Nenhum curso encontrado com esses filtros.</EmptyState>}
      {filtered.length > 0 && (
        <>
          {hasFilters && <p className="mb-3 text-[13px] text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
