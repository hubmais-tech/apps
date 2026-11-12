import { cn } from '@/lib/utils'

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })

/** "2026-11-10" vira "ter". A data já vem no fuso de Aracaju, então formatamos em UTC ao meio-dia. */
export function dayLabel(date: string) {
  return weekday.format(new Date(`${date}T12:00:00Z`)).replace('.', '')
}

/**
 * Barras da semana: a altura segue a mesma escala para todas as barras, o último dia (hoje) fica em destaque
 * e cada barra tem um rótulo acessível com o valor.
 */
export function WeekBars({ data, unit, tone = 'orange' }: { data: { date: string; value: number }[]; unit: { one: string; other: string }; tone?: 'orange' | 'primary' }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <figure className="space-y-3">
      <div className="flex h-32 items-end gap-2" role="img" aria-label={`${total} ${total === 1 ? unit.one : unit.other} nos últimos 7 dias`}>
        {data.map((day, index) => {
          const today = index === data.length - 1
          return (
            <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground tabular">{day.value || ''}</span>
              <div
                title={`${dayLabel(day.date)}: ${day.value} ${day.value === 1 ? unit.one : unit.other}`}
                className={cn('w-full rounded-t-md', day.value === 0 ? 'bg-muted' : today ? (tone === 'orange' ? 'bg-orange' : 'bg-primary') : tone === 'orange' ? 'bg-orange-soft' : 'bg-primary-soft')}
                style={{ height: day.value === 0 ? '4px' : `${Math.max(10, (day.value / max) * 100)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2" aria-hidden>
        {data.map((day, index) => (
          <span key={day.date} className={cn('flex-1 text-center text-[11px] capitalize', index === data.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {index === data.length - 1 ? 'hoje' : dayLabel(day.date)}
          </span>
        ))}
      </div>
    </figure>
  )
}
