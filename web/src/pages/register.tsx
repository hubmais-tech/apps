import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Briefcase, GraduationCap, Presentation } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const roles = [
  { value: 'student', label: 'Quero aprender', text: 'Faça cursos curtos e entre no Banco de Talentos.', icon: GraduationCap, tone: 'bg-primary-soft text-primary' },
  { value: 'mentor', label: 'Quero ensinar', text: 'Publique cursos e receba pelas vendas na sua carteira.', icon: Presentation, tone: 'bg-orange-soft text-orange' },
  { value: 'company', label: 'Sou empresa', text: 'Conheça jovens talentos e acompanhe a formação.', icon: Briefcase, tone: 'bg-sand-soft text-warning' },
] as const

type SelfRole = (typeof roles)[number]['value']

/** Cadastro em dois passos: perfil e dados. Não pedimos CPF (docs/DECISIONS.md). */
export function RegisterPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<SelfRole>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const register = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password, role })
      return data
    },
    onSuccess: async (data) => {
      await signIn(data.token)
      toast.success('Conta criada com sucesso!')
      navigate('/onboarding', { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    register.mutate()
  }

  // Quem já está logado não precisa se cadastrar de novo. Durante o próprio cadastro, quem navega é o onSuccess.
  if (user && !register.isPending && !register.isSuccess) return <Navigate to="/" replace />

  const labels = ['Perfil', 'Seus dados']

  return (
    <AuthShell
      footer={
        <>
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <ol className="flex gap-2" aria-label="Etapas do cadastro">
        {labels.map((label, index) => {
          const n = index + 1
          return (
            <li key={label} aria-current={step === n ? 'step' : undefined} className={cn('flex flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground', step === n && 'font-semibold text-foreground')}>
              <span className={cn('h-1 rounded-full', step >= n ? 'bg-primary' : 'bg-border')} />
              {label}
            </li>
          )
        })}
      </ol>

      {step === 1 ? (
        <div className="space-y-5">
          <div>
            <h1 className="text-[28px] leading-tight font-bold">Como você quer usar o Hub+?</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Escolha seu perfil para começar.</p>
          </div>
          <fieldset className="space-y-2.5">
            <legend className="sr-only">Tipo de conta</legend>
            {roles.map(({ value, label, text, icon: Icon, tone }) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-center gap-3.5 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:bg-faint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                  role === value && 'border-primary bg-primary-soft shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary-soft',
                )}
              >
                <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-lg', tone)}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  <b className="block text-sm font-semibold">{label}</b>
                  <span className="text-[13px] text-muted-foreground">{text}</span>
                </span>
                <span className={cn('grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-input', role === value && 'border-primary bg-primary')}>
                  {role === value && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                </span>
              </label>
            ))}
          </fieldset>
          <Button size="lg" className="w-full" onClick={() => setStep(2)}>
            Continuar <ArrowRight />
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <h1 className="text-[28px] leading-tight font-bold">Quase lá, quem é você?</h1>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Leva menos de um minuto. Não pedimos CPF agora.</p>
          </div>
          <div className="space-y-4">
            <Field label={role === 'company' ? 'Nome da empresa' : 'Nome completo'} htmlFor="name">
              <Input id="name" required minLength={2} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="E-mail" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
              <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button type="submit" size="lg" className="flex-1" loading={register.isPending}>
              Criar conta
            </Button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}
