import { Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

/**
 * Empresa não se cadastra sozinha: o Hub+ cadastra e convida o responsável (D23).
 * Esta tela só aparece para contas antigas de empresa, criadas antes dessa decisão, sem empresa vinculada.
 */
export function CompanyNoAccess() {
  const { signOut } = useAuth()

  return (
    <AuthShell>
      <div className="space-y-3">
        <span className="grid size-10 place-items-center rounded-lg bg-sand-soft text-warning">
          <Building2 className="size-5" />
        </span>
        <h1 className="text-[28px] leading-tight font-bold">Sua conta ainda não está vinculada a uma empresa</h1>
        <p className="text-[15px] text-muted-foreground">
          O cadastro de empresas no Hub+ é feito pela nossa equipe. Fale com o Hub+, informe o CNPJ e quem vai gerenciar a conta, e a pessoa indicada recebe um convite para ativar o acesso.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button asChild variant="secondary">
          <Link to="/explore">Explorar cursos</Link>
        </Button>
        <Button variant="ghost" onClick={signOut}>
          Sair
        </Button>
      </div>
    </AuthShell>
  )
}
