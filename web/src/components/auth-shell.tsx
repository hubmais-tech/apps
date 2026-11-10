import { Clock, Quote } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/logo'

/** Tela dividida: formulário de um lado, prova social do outro (some no celular). */
export function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-2">
      <div className="flex flex-col gap-6 px-4 py-7 sm:px-10">
        <Link to="/" aria-label="Voltar ao início" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-6 py-6">
          {children}
          {footer && <div className="text-center text-[13px] text-muted-foreground">{footer}</div>}
        </div>
      </div>

      <aside className="relative hidden place-items-center overflow-hidden bg-lilac-soft p-10 lg:grid" aria-hidden="true">
        <span className="absolute top-6 right-6 inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground">
          <Clock className="size-3.5" /> Cursos de 4 a 6 semanas
        </span>
        <div className="relative w-full max-w-[420px] space-y-5">
          <svg viewBox="0 0 400 260" className="w-full" fill="none">
            <circle cx="300" cy="70" r="64" fill="var(--primary)" opacity=".16" />
            <rect x="30" y="120" width="190" height="110" rx="14" fill="var(--primary)" opacity=".2" />
            <rect x="52" y="52" width="120" height="16" rx="8" fill="var(--orange)" opacity=".4" />
            <circle cx="320" cy="190" r="34" fill="var(--orange)" opacity=".3" />
          </svg>
          <figure className="rounded-xl border border-border bg-surface p-5">
            <Quote className="mb-2 size-5 text-primary" />
            <blockquote className="text-[15px] leading-relaxed">Aprender com mentores de verdade, no meu ritmo, e ainda sair com um portfólio para mostrar para as empresas.</blockquote>
            <figcaption className="mt-3 text-xs text-muted-foreground">Hub Juventude+ · Aracaju, Sergipe</figcaption>
          </figure>
        </div>
      </aside>
    </div>
  )
}
