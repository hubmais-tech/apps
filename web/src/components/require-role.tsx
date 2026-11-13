import { Loader2 } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/api'

/** Protege rotas no navegador. A autorização real é sempre feita pela API (CASL). */
export function RequireRole({ roles, allowPendingOnboarding = false }: { roles: Role[]; allowPendingOnboarding?: boolean }) {
  const { user, onboarding, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!roles.includes(user.role)) return <Navigate to="/painel" replace />
  // Mentor sem carteira aberta e empresa sem cadastro precisam concluir o onboarding antes (D12).
  if (!allowPendingOnboarding && onboarding?.required && !onboarding.completed) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
