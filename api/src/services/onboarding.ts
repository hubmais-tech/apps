import { eq } from 'drizzle-orm'

import type { AuthUser } from '@/auth'
import { database } from '@/database/connection'
import { studentProfiles } from '@/database/schema'

export type Onboarding = {
  /** O front-end redireciona para o onboarding enquanto `required` e não `completed`. */
  required: boolean
  completed: boolean
  /** Rota do onboarding do perfil, quando existe. */
  path: string | null
}

/** Estado do onboarding por perfil (docs/DECISIONS.md, D12). */
export async function getOnboarding(user: AuthUser): Promise<Onboarding> {
  switch (user.role) {
    case 'mentor':
      return { required: true, completed: Boolean(user.walletOpened), path: '/onboarding' }
    case 'company':
      return { required: true, completed: Boolean(user.companyId), path: '/onboarding' }
    case 'student': {
      const [profile] = await database.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id))
      return {
        required: false,
        completed: Boolean(profile?.onboardingCompletedAt ?? profile?.onboardingSkippedAt),
        path: '/onboarding',
      }
    }
    default:
      return { required: false, completed: true, path: null }
  }
}
