import { Check, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export type OnboardingStep = { title: string; description: string }

/**
 * Casca do onboarding: passos na lateral (desktop) ou barra de progresso (celular) e o formulário ao lado.
 * Segue o padrão de "primeiro acesso" das referências do protótipo.
 */
export function OnboardingShell({
  heading,
  intro,
  steps,
  current,
  children,
}: {
  heading: string
  intro: string
  steps: OnboardingStep[]
  /** Índice do passo atual, começando em 0. */
  current: number
  children: React.ReactNode
}) {
  const { signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" aria-label="Hub+ início">
            <Logo />
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut /> Sair
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[300px_1fr] lg:py-10">
        <aside className="space-y-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl leading-tight font-bold">{heading}</h1>
            <p className="text-muted-foreground">{intro}</p>
          </div>

          <div className="space-y-2 lg:hidden">
            <p className="text-xs font-semibold text-muted-foreground tabular">
              Passo {current + 1} de {steps.length} · {steps[current]?.title}
            </p>
            <Progress value={((current + 1) / steps.length) * 100} tone="primary" />
          </div>

          <ol className="hidden space-y-0 lg:block" aria-label="Etapas">
            {steps.map((step, index) => {
              const done = index < current
              const active = index === current
              return (
                <li key={step.title} aria-current={active ? 'step' : undefined} className="relative flex gap-3 pb-6 last:pb-0">
                  {index < steps.length - 1 && <span className={cn('absolute top-7 bottom-0 left-[13px] w-px', done ? 'bg-primary' : 'bg-border')} aria-hidden />}
                  <span
                    className={cn(
                      'z-10 grid size-[27px] shrink-0 place-items-center rounded-full border-[1.5px] text-xs font-semibold',
                      done && 'border-primary bg-primary text-primary-foreground',
                      active && 'border-primary bg-primary-soft text-primary',
                      !done && !active && 'border-border bg-surface text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="leading-tight">
                    <b className={cn('block text-sm font-semibold', !active && !done && 'text-muted-foreground')}>{step.title}</b>
                    <span className="text-xs text-muted-foreground">{step.description}</span>
                  </span>
                </li>
              )
            })}
          </ol>
        </aside>

        <main className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-7">{children}</main>
      </div>
    </div>
  )
}

/** Cabeçalho de passo dentro do formulário. */
export function StepHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 space-y-1">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  )
}

/** Escolha múltipla em chips (interesses, áreas de atuação). */
export function ChipSelect({
  options,
  value,
  onChange,
  max,
  label,
}: {
  options: readonly string[]
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  label: string
}) {
  function toggle(option: string) {
    if (value.includes(option)) onChange(value.filter((v) => v !== option))
    else if (!max || value.length < max) onChange([...value, option])
  }

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(option)}
            className={cn(
              'inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
              selected ? 'border-primary bg-primary-soft font-semibold text-primary' : 'border-border bg-surface hover:bg-faint',
            )}
          >
            {selected && <Check className="size-3.5" />}
            {option}
          </button>
        )
      })}
    </div>
  )
}

/** Linhas de revisão (rótulo e valor) antes de enviar. */
export function ReviewList({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border rounded-lg border border-border">
      {items.map((item) => (
        <div key={item.label} className="grid gap-0.5 px-3.5 py-2.5 sm:grid-cols-[170px_1fr] sm:gap-3">
          <dt className="text-xs font-semibold text-muted-foreground uppercase">{item.label}</dt>
          <dd className="text-[13px] break-words">{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
