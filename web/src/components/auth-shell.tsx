import { Award, Briefcase, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/logo'

/** O que a plataforma entrega de verdade. Nada de depoimento: só funcionalidades que existem. */
const highlights = [
  { icon: GraduationCap, title: 'Cursos de 4 a 6 semanas', text: 'Aulas em vídeo criadas por mentores que trabalham na área.' },
  { icon: Award, title: 'Desafios, projetos e certificado', text: 'O mentor corrige seus trabalhos. O que for aprovado vira projeto validado no seu portfólio.' },
  { icon: Briefcase, title: 'Banco de Talentos', text: 'Empresas veem seu portfólio e convidam você para vagas. Seu contato só aparece depois que você aceita.' },
]

/** Tela dividida: formulário de um lado, a proposta do Hub+ do outro (some no celular). */
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

      <aside className="relative hidden place-items-center overflow-hidden bg-lilac-soft p-10 lg:grid">
        <div className="relative w-full max-w-[420px] space-y-6">
          <svg viewBox="0 0 400 120" className="w-full" fill="none" aria-hidden="true">
            <circle cx="320" cy="44" r="44" fill="var(--primary)" opacity=".16" />
            <rect x="20" y="52" width="170" height="52" rx="12" fill="var(--primary)" opacity=".2" />
            <rect x="36" y="22" width="110" height="14" rx="7" fill="var(--orange)" opacity=".4" />
          </svg>
          <div className="space-y-2.5">
            <h2 className="text-lg font-bold">Do primeiro curso à primeira entrevista</h2>
            <ul className="space-y-2.5">
              {highlights.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-[13px] leading-snug">
                    <b className="block text-sm font-semibold">{title}</b>
                    <span className="text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  )
}
