import { useQuery } from '@tanstack/react-query'
import { Building2, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { api } from '@/lib/api'
import { maskCnpj } from '@/lib/masks'
import { companyAccessMeta, type AdminCompanySummary, type CompanyAccessStatus } from '@/lib/types-company'
import { formatDate } from '@/lib/utils'

/** Empresas cadastradas pelo Hub+ e o estado do acesso de cada uma (D23). */
export function AdminCompaniesPage() {
  const [status, setStatus] = useState<CompanyAccessStatus | ''>('')
  const [term, setTerm] = useState('')

  const query = useQuery({
    queryKey: ['admin-companies', status, term],
    queryFn: async () => (await api.get<{ companies: AdminCompanySummary[] }>('/admin/companies', { params: { status: status || undefined, q: term.trim() || undefined } })).data.companies,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Cada empresa tem um cadastro só, feito pelo Hub+. A empresa indica quem gerencia a conta."
        actions={
          <Button asChild>
            <Link to="/admin/companies/new">
              <Plus /> Nova empresa
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input aria-label="Buscar empresa" placeholder="Buscar por nome, CNPJ ou responsável" className="pl-9" value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <Select aria-label="Filtrar por estado do acesso" className="sm:w-[220px]" value={status} onChange={(e) => setStatus(e.target.value as CompanyAccessStatus | '')}>
          <option value="">Todos os estados</option>
          <option value="active">Acesso ativo</option>
          <option value="pending">Convite pendente</option>
          <option value="expired">Convite vencido</option>
        </Select>
      </div>

      {query.isLoading && <Loading />}
      {query.isError && <ErrorState onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && (
        <EmptyState>
          <p className="mb-3">{status || term ? 'Nenhuma empresa com esse filtro.' : 'Nenhuma empresa cadastrada ainda.'}</p>
          {!status && !term && (
            <Button asChild>
              <Link to="/admin/companies/new">Cadastrar a primeira empresa</Link>
            </Button>
          )}
        </EmptyState>
      )}

      {query.data && query.data.length > 0 && (
        <Card>
          <ul>
            {query.data.map((company) => {
              const meta = companyAccessMeta[company.status]
              return (
                <li key={company.id} className="border-t border-border first:border-t-0">
                  <Link to={`/admin/companies/${company.id}`} className="flex flex-wrap items-center gap-3 px-[18px] py-3.5 hover:bg-faint">
                    <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-lilac-soft text-primary" aria-hidden>
                      <Building2 className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block truncate text-[13px] font-semibold">{company.tradeName}</b>
                      <span className="block truncate text-xs text-muted-foreground">
                        {maskCnpj(company.cnpj)} · {company.city}/{company.state} · cadastrada em {formatDate(company.createdAt)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{company.manager ? `Responsável: ${company.manager.name} (${company.manager.email})` : 'Sem responsável'}</span>
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
