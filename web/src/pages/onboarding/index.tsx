import { Navigate } from 'react-router-dom'

import { Loading } from '@/components/query-state'
import { useAuth } from '@/lib/auth'

import { CompanyNoAccess } from './company'
import { MentorOnboarding } from './mentor'
import { StudentOnboarding } from './student'

/** Escolhe o onboarding pelo perfil (D12). Quem já concluiu volta para o início. */
export function OnboardingPage() {
  const { user, onboarding, isLoading } = useAuth()

  if (isLoading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  if (!onboarding?.path || onboarding.completed) return <Navigate to="/painel" replace />

  if (user.role === 'mentor') return <MentorOnboarding />
  if (user.role === 'company') return <CompanyNoAccess />
  return <StudentOnboarding />
}
