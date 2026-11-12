import { useMutation, useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthShell } from '@/components/auth-shell'
import { Loading } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage, type User } from '@/lib/api'
import { useAuth } from '@/lib/auth'

/** Representante convidado cria a senha e entra na empresa (D14). */
export function AcceptInvitePage() {
  const { token = '' } = useParams()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')

  const invite = useQuery({
    queryKey: ['invite', token],
    retry: false,
    queryFn: async () => (await api.get<{ name: string; email: string; jobTitle: string; companyName: string; isManager: boolean }>(`/auth/invite/${token}`)).data,
  })

  const accept = useMutation({
    mutationFn: async () => (await api.post<{ token: string; user: User }>('/auth/accept-invite', { token, password })).data,
    onSuccess: async (data) => {
      await signIn(data.token)
      toast.success('Acesso criado. Bem-vindo ao Hub+!')
      navigate('/', { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    accept.mutate()
  }

  if (invite.isLoading) return <Loading />

  if (invite.isError || !invite.data) {
    return (
      <AuthShell>
        <div>
          <h1 className="text-[28px] leading-tight font-bold">Convite indisponível</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{getErrorMessage(invite.error, 'Este convite não existe ou já venceu. Peça um novo link ao Hub+ ou ao responsável pela conta da empresa.')}</p>
        </div>
        <Button asChild>
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthShell>
    )
  }

  const data = invite.data
  return (
    <AuthShell>
      <div className="space-y-3">
        <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
          <Building2 className="size-5" />
        </span>
        <h1 className="text-[28px] leading-tight font-bold">{data.isManager ? `Ative o acesso da ${data.companyName}` : `Entrar na equipe da ${data.companyName}`}</h1>
        <p className="text-[15px] text-muted-foreground">
          {data.name}, você foi indicado como <b className="font-semibold text-foreground">{data.isManager ? 'responsável pela conta' : data.jobTitle}</b>
          {data.isManager ? ' pela empresa. O Hub+ já cadastrou os dados dela: falta só criar sua senha.' : '. Crie uma senha para acessar o Hub+.'}
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail de acesso" htmlFor="invite-email">
          <Input id="invite-email" value={data.email} readOnly />
        </Field>
        <Field label="Crie uma senha" htmlFor="invite-password" hint="Mínimo de 8 caracteres.">
          <Input id="invite-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={accept.isPending}>
          Criar acesso
        </Button>
      </form>
    </AuthShell>
  )
}
