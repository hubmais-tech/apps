import { Award, BookOpen, Briefcase, Building2, ClipboardCheck, Compass, FolderKanban, Mail, Send, GraduationCap, Home, LogOut, Moon, Receipt, Search, Settings, ShoppingBag, Sun, Users, Wallet } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import type { Onboarding, Role } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const roleLabel: Record<Role, string> = {
  student: 'Aluno',
  mentor: 'Mentor',
  company: 'Empresa',
  admin: 'Admin',
}

type NavEntry = { to: string; label: string; icon: typeof Wallet; end?: boolean }
type NavGroup = { title: string; items: NavEntry[] }

const home: NavEntry = { to: '/', label: 'Início', icon: Home, end: true }
const explore: NavEntry = { to: '/explore', label: 'Explorar cursos', icon: Compass }
const learning: NavEntry = { to: '/my-learning', label: 'Meus estudos', icon: GraduationCap }

const settings: NavEntry = { to: '/settings', label: 'Configurações', icon: Settings }

function navFor(role: Role, onboarding: Onboarding | null): NavGroup[] {
  const pending = Boolean(onboarding?.required && !onboarding.completed)

  if (role === 'mentor') {
    if (pending) {
      return [{ title: 'Primeiros passos', items: [{ to: '/onboarding', label: 'Abrir carteira', icon: Wallet }, explore] }]
    }
    return [
      { title: 'Menu', items: [home, explore, learning] },
      {
        title: 'Mentoria',
        items: [
          { to: '/mentor/courses', label: 'Meus cursos', icon: BookOpen },
          { to: '/mentor/reviews', label: 'Correções', icon: ClipboardCheck },
          { to: '/mentor/wallet', label: 'Carteira', icon: Wallet },
        ],
      },
      { title: 'Conta', items: [settings] },
    ]
  }
  if (role === 'company') {
    if (pending) {
      return [{ title: 'Primeiros passos', items: [{ to: '/onboarding', label: 'Acesso da empresa', icon: Building2 }, explore] }]
    }
    return [
      { title: 'Menu', items: [home, { to: '/talents', label: 'Banco de Talentos', icon: Briefcase }, { to: '/company/invitations', label: 'Convites enviados', icon: Send }, explore] },
      { title: 'Empresa', items: [{ to: '/settings?tab=team', label: 'Equipe', icon: Users }] },
      { title: 'Conta', items: [settings] },
    ]
  }
  if (role === 'admin') {
    return [
      { title: 'Menu', items: [{ to: '/admin', label: 'Visão geral', icon: Home, end: true }, explore] },
      {
        title: 'Administração',
        items: [
          { to: '/admin/wallet', label: 'Carteira Hub+', icon: Wallet },
          { to: '/admin/companies', label: 'Empresas', icon: Building2 },
          { to: '/admin/withdrawals', label: 'Saques', icon: Receipt },
          { to: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
        ],
      },
    ]
  }
  return [
    { title: 'Menu', items: [home, explore, learning] },
    {
      title: 'Carreira',
      items: [
        { to: '/portfolio', label: 'Portfólio', icon: FolderKanban },
        { to: '/certificates', label: 'Certificados', icon: Award },
        { to: '/invitations', label: 'Convites', icon: Mail },
      ],
    },
    { title: 'Conta', items: [settings] },
  ]
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-full bg-lilac-soft text-xs font-semibold text-primary', className)} aria-hidden>
      {initials(name)}
    </span>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <Button variant="secondary" size="icon" onClick={toggle} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}

function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    navigate(term.trim() ? `/explore?q=${encodeURIComponent(term.trim())}` : '/explore')
  }

  return (
    <form onSubmit={onSubmit} role="search" className={cn('flex h-[38px] items-center gap-2 rounded-md border border-border bg-faint px-3 text-muted-foreground focus-within:border-ring focus-within:bg-surface', className)}>
      <Search className="size-4 shrink-0" />
      <input
        type="search"
        aria-label="Buscar cursos e mentores"
        placeholder="Buscar cursos, mentores…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </form>
  )
}

function SidebarLink({ item }: { item: NavEntry }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'relative flex h-[38px] items-center gap-2.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-faint hover:text-foreground',
          isActive && 'bg-primary-soft font-semibold text-primary hover:bg-primary-soft hover:text-primary before:absolute before:top-2 before:-left-4 before:bottom-2 before:w-[3px] before:rounded-r before:bg-primary',
        )
      }
    >
      <item.icon className="size-[18px]" />
      {item.label}
    </NavLink>
  )
}

/** Navegação pública: uma barra simples no topo, sem sidebar. */
function PublicLayout() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" aria-label="Hub+ início">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Principal">
            <NavLink to="/explore" className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground', isActive && 'bg-primary-soft text-primary')}>
              Explorar cursos
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}

function AppLayout() {
  const { user, onboarding, signOut } = useAuth()
  if (!user) return null
  const groups = navFor(user.role, onboarding)
  const tabs = groups.flatMap((g) => g.items).slice(0, 5)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-4 lg:flex">
        <Link to="/" aria-label="Hub+ início" className="px-2 pt-1">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="flex flex-1 flex-col gap-5">
          {groups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{group.title}</p>
              {group.items.map((item) => (
                <SidebarLink key={item.to} item={item} />
              ))}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-border p-2 pt-4">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel[user.role]}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={signOut} aria-label="Sair">
            <LogOut />
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
          <Link to="/" aria-label="Hub+ início" className="lg:hidden">
            <Logo withName={false} />
          </Link>
          <SearchBox className="max-w-sm flex-1" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Avatar name={user.name} className="lg:hidden" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-7 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface px-2 pt-1.5 lg:hidden"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {tabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[11px] font-medium text-muted-foreground', isActive && 'font-semibold text-primary')}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('size-6 rounded-md p-[3px]', isActive && 'bg-primary-soft')} />
                <span className="max-w-full truncate">{item.label.replace('Explorar cursos', 'Explorar')}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Layout() {
  const { user, isLoading } = useAuth()
  // Evita piscar o layout público enquanto o token salvo é validado.
  if (isLoading) return <div className="min-h-dvh" />
  return user ? <AppLayout /> : <PublicLayout />
}
