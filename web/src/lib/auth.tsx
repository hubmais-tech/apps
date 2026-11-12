import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

import { AxiosError } from 'axios'

import { api, tokenStorage, type Onboarding, type User } from './api'

type AuthContextValue = {
  user: User | null
  /** Estado do onboarding do perfil (D12). Nulo sem login. */
  onboarding: Onboarding | null
  isLoading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

type Session = { user: User; onboarding: Onboarding }

/** Busca a sessão. Só descarta o token quando a API diz que ele não vale mais (401). Falha de rede não desloga. */
async function fetchSession(): Promise<Session | null> {
  try {
    const { data } = await api.get<Session>('/me')
    return data
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      tokenStorage.clear()
      return null
    }
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: session, isLoading } = useQuery({
    queryKey: ['me'],
    enabled: Boolean(tokenStorage.get()),
    retry: false,
    queryFn: fetchSession,
  })
  const user = session?.user

  const signIn = useCallback(
    async (token: string) => {
      tokenStorage.set(token)
      // O hook de sessão estava desligado (sem token) quando a tela foi renderizada, então invalidar não busca nada.
      // Buscar aqui garante que o usuário já esteja carregado quando a navegação acontecer.
      await queryClient.fetchQuery({ queryKey: ['me'], queryFn: fetchSession, staleTime: 0 })
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
      onboarding: session?.onboarding ?? null,
      isLoading: Boolean(tokenStorage.get()) && isLoading,
      signIn,
      signOut,
    }),
    [user, session?.onboarding, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return context
}
