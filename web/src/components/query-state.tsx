import { Inbox, Loader2, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Loading() {
  return (
    <div className="flex justify-center py-20" role="status" aria-label="Carregando">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <span className="grid size-11 place-items-center rounded-lg bg-destructive/12 text-destructive">
        <TriangleAlert className="size-5" />
      </span>
      <p className="max-w-sm text-muted-foreground">{message ?? 'Não foi possível carregar os dados.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-12 text-center text-muted-foreground', className)}>
      <span className="grid size-10 place-items-center rounded-lg bg-muted">
        <Inbox className="size-5" />
      </span>
      <div>{children}</div>
    </div>
  )
}

/** Título de página: o mesmo padrão em todas as telas internas. */
export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

/** Cartão de indicador: rótulo, ícone, valor e uma linha de apoio. */
export function Stat({ label, value, hint, icon: Icon, tone = 'primary' }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: typeof Inbox; tone?: 'primary' | 'orange' | 'success' | 'warning' }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    orange: 'bg-orange-soft text-orange',
    success: 'bg-mint-soft text-success',
    warning: 'bg-sand-soft text-warning',
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
        {label}
        <span className={cn('grid size-[30px] place-items-center rounded-lg', tones[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="font-heading text-[26px] leading-tight font-semibold tabular">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
