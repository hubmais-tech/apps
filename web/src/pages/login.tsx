import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/painel'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const login = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
      return data
    },
    onSuccess: async (data) => {
      await signIn(data.token)
      navigate(from, { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    login.mutate()
  }

  // Quem já está logado não precisa ver o login. Durante o próprio login, quem navega é o onSuccess.
  if (user && !login.isPending && !login.isSuccess) return <Navigate to="/painel" replace />

  return (
    <AuthShell
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <div>
        <h1 className="text-[28px] leading-tight font-bold">Bem-vindo de volta</h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">Entre para continuar de onde parou.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Entrar
        </Button>
      </form>
    </AuthShell>
  )
}
