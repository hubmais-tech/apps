import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Award, BookOpen, Briefcase, Handshake, Landmark, Receipt, ShoppingBag, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorState, Loading, PageHeader, Stat } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { AdminOverview } from '@/lib/types-company'
import { cn, formatCurrency } from '@/lib/utils'

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })

function dayLabel(date: string) {
  return weekday.format(new Date(`${date}T12:00:00Z`)).replace('.', '')
}

/** Escala "bonita" com no mínimo 4 passos inteiros, para o gráfico nunca ficar vazio nem achatado. */
function niceMax(value: number) {
  if (value <= 4) return 4
  const step = Math.ceil(value / 4)
  return step * 4
}

/** Barras da semana. Uma escala só, com grade em valores inteiros e rótulo de valor acima de cada barra. */
function WeekChart({ title, data, color, unit }: { title: string; data: { date: string; value: number }[]; color: string; unit: string }) {
  const width = 340
  const height = 190
  const left = 28
  const bottom = 26
  const top = 18
  const plotH = height - top - bottom
  const plotW = width - left - 8
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i)
  const slot = plotW / data.length
  const barW = Math.min(28, slot * 0.58)
  const y = (v: number) => top + plotH - (v / max) * plotH
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <figure className="space-y-2">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground tabular">
          {total} {unit} nos últimos 7 dias
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}: ${data.map((d) => `${dayLabel(d.date)} ${d.value}`).join(', ')}`} className="w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - 8} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray={tick === 0 ? undefined : '3 4'} />
            <text x={left - 6} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
              {tick}
            </text>
          </g>
        ))}
        {data.map((d, index) => {
          const cx = left + slot * index + slot / 2
          const barH = (d.value / max) * plotH
          const isLast = index === data.length - 1
          return (
            <g key={d.date}>
              <rect x={cx - barW / 2} y={y(d.value)} width={barW} height={Math.max(barH, d.value > 0 ? 2 : 0)} rx="4" fill={color} opacity={isLast ? 1 : 0.55} />
              {d.value > 0 && (
                <text x={cx} y={y(d.value) - 5} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">
                  {d.value}
                </text>
              )}
              <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
                {dayLabel(d.date)}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

function Shortcut({ to, icon: Icon, title, text, highlight }: { to: string; icon: typeof Wallet; title: string; text: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={cn('group flex items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary', highlight ? 'border-orange bg-orange-soft' : 'border-border')}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', highlight ? 'bg-orange text-white' : 'bg-primary-soft text-primary')}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block text-[13px] font-semibold">{title}</b>
        <span className="text-xs text-muted-foreground">{text}</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

export function AdminOverviewPage() {
  const query = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get<AdminOverview>('/admin/overview')).data,
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />

  const d = query.data
  const pendingWithdrawals = d.withdrawals.requested > 0
  const people = d.users.student + d.users.mentor + d.users.company

  return (
    <div className="space-y-5">
      <PageHeader title="Visão geral" description="Números da plataforma em tempo real. Valores em reais." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Receita bruta" value={formatCurrency(d.sales.grossInCents)} icon={ShoppingBag} tone="success" hint={`${d.sales.paidOrders} ${d.sales.paidOrders === 1 ? 'pedido pago' : 'pedidos pagos'}`} />
        <Stat label="Retenção do Hub+" value={formatCurrency(d.sales.platformFeeInCents)} icon={Landmark} hint={d.sales.refunded ? `${d.sales.refunded} reembolsado${d.sales.refunded === 1 ? '' : 's'}` : 'Sem reembolsos'} />
        <Stat label="Pedidos pagos" value={d.sales.paidOrders} icon={Receipt} tone="orange" hint={`${d.courses.published} de ${d.courses.total} cursos publicados`} />
        <Stat label="Saques para pagar" value={d.withdrawals.requested} icon={Wallet} tone={pendingWithdrawals ? 'warning' : 'success'} hint={pendingWithdrawals ? `${formatCurrency(d.withdrawals.requestedInCents)} aguardando o Pix` : 'Nenhum pendente'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <WeekChart title="Pedidos pagos" unit="pedidos" color="var(--primary)" data={d.week.map((w) => ({ date: w.date, value: w.orders }))} />
            <WeekChart title="Novos usuários" unit="usuários" color="var(--orange)" data={d.week.map((w) => ({ date: w.date, value: w.users }))} />
          </CardContent>
        </Card>

        <div className="space-y-3 lg:col-span-4">
          <Shortcut to="/admin/withdrawals" icon={Wallet} title="Saques" text={pendingWithdrawals ? `${d.withdrawals.requested} para pagar, ${formatCurrency(d.withdrawals.requestedInCents)}` : 'Nenhum saque pendente'} highlight={pendingWithdrawals} />
          <Shortcut to="/admin/wallet" icon={Landmark} title="Carteira do Hub+" text="Saldo, extrato e saques da plataforma" />
          <Shortcut to="/admin/orders" icon={Receipt} title="Pedidos" text="Compras, divisão e reembolsos" />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pessoas</CardTitle>
            <Badge variant="primary" className="tabular">
              {people}
            </Badge>
          </CardHeader>
          <ul>
            {[
              { label: 'Alunos', value: d.users.student, icon: Users },
              { label: 'Mentores', value: d.users.mentor, icon: BookOpen },
              { label: 'Empresas', value: d.users.company, icon: Briefcase },
            ].map(({ label, value, icon: Icon }) => (
              <li key={label} className="flex items-center gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-[13px]">{label}</span>
                <b className="text-[13px] font-semibold tabular">{value}</b>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-[18px] py-3 text-xs text-muted-foreground">
            <b className="font-semibold tabular text-foreground">{d.users.newLast7Days}</b> {d.users.newLast7Days === 1 ? 'novo cadastro' : 'novos cadastros'} nos últimos 7 dias.
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formação</CardTitle>
          </CardHeader>
          <ul>
            <li className="flex items-center gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-mint-soft text-success">
                <BookOpen className="size-4" />
              </span>
              <span className="flex-1 text-[13px]">Cursos publicados</span>
              <b className="text-[13px] font-semibold tabular">
                {d.courses.published} <span className="font-normal text-muted-foreground">de {d.courses.total}</span>
              </b>
            </li>
            <li className="flex items-center gap-3 border-t border-border px-[18px] py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sand-soft text-warning">
                <Award className="size-4" />
              </span>
              <span className="flex-1 text-[13px]">Certificados emitidos</span>
              <b className="text-[13px] font-semibold tabular">{d.certificates}</b>
            </li>
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banco de Talentos</CardTitle>
          </CardHeader>
          <ul>
            <li className="flex items-center gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Briefcase className="size-4" />
              </span>
              <span className="flex-1 text-[13px]">Convites enviados</span>
              <b className="text-[13px] font-semibold tabular">{d.invitations.total}</b>
            </li>
            <li className="flex items-center gap-3 border-t border-border px-[18px] py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
                <Handshake className="size-4" />
              </span>
              <span className="flex-1 text-[13px]">Contratações registradas</span>
              <b className="text-[13px] font-semibold tabular">{d.invitations.hired}</b>
            </li>
          </ul>
          <p className="border-t border-border px-[18px] py-3 text-xs text-muted-foreground">Alimenta o relatório de impacto. A taxa de intermediação ainda não é cobrada.</p>
        </Card>
      </div>
    </div>
  )
}
