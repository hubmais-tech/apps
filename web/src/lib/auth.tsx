import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { api, tokenStorage, type User } from './api'

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    enabled: Boolean(tokenStorage.get()),
    retry: false,
    queryFn: async () => {
      try {
        const { data } = await api.get<{ user: User }>('/me')
        return data.user
      } catch {
        tokenStorage.clear()
        return null
      }
    },
  })

  const signIn = useCallback(
    async (token: string) => {
      tokenStorage.set(token)
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    [queryClient],
  )

  const signOut = useCallback(() => {
    tokenStorage.clear()
    queryClient.clear()
    window.location.assign('/')
  }, [queryClient])

  const value = useMemo(
    () => ({
      user: user ?? null,
      isLoading: Boolean(tokenStorage.get()) && isLoading,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
