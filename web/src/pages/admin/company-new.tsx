import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { InviteLink } from '@/components/invite-link'
import { PageHeader } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { isValidCnpj, maskCnpj, maskPhone, onlyDigits } from '@/lib/masks'
import { brazilianStates, companySectors, companySizes } from '@/lib/options'

const empty = {
  cnpj: '',
  legalName: '',
  tradeName: '',
  sector: '',
  size: '',
  city: 'Aracaju',
  state: 'SE',
  website: '',
  managerName: '',
  managerJobTitle: '',
  managerEmail: '',
  managerPhone: '',
}

/** O Hub+ cadastra a empresa e a pessoa que ela indicou para gerenciar a conta (D23). */
export function AdminCompanyNewPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [created, setCreated] = useState<{ companyId: string; inviteUrl: string; name: string } | null>(null)

  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate() {
    const next: Record<string, string> = {}
    if (!isValidCnpj(form.cnpj)) next.cnpj = 'CNPJ inválido.'
    if (form.legalName.trim().length < 3) next.legalName = 'Informe a razão social.'
    if (form.tradeName.trim().length < 2) next.tradeName = 'Informe o nome fantasia.'
    if (!form.sector) next.sector = 'Escolha o setor.'
    if (!form.size) next.size = 'Escolha o porte.'
    if (form.city.trim().length < 2) next.city = 'Informe a cidade.'
    if (form.managerName.trim().length < 2) next.managerName = 'Informe o nome do responsável.'
    if (form.managerJobTitle.trim().length < 2) next.managerJobTitle = 'Informe o cargo do responsável.'
    if (!/^\S+@\S+\.\S+$/.test(form.managerEmail.trim())) next.managerEmail = 'Informe um e-mail válido.'
    if (![10, 11].includes(onlyDigits(form.managerPhone).length)) next.managerPhone = 'Informe o telefone com DDD.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ companyId: string; inviteUrl: string }>('/admin/companies', {
          cnpj: form.cnpj,
          legalName: form.legalName.trim(),
          tradeName: form.tradeName.trim(),
          sector: form.sector,
          size: form.size,
          city: form.city.trim(),
          state: form.state,
          website: form.website.trim() || null,
          manager: { name: form.managerName.trim(), jobTitle: form.managerJobTitle.trim(), email: form.managerEmail.trim(), phone: onlyDigits(form.managerPhone) },
        })
      ).data,
    onSuccess: (data) => {
      setCreated({ ...data, name: form.tradeName.trim() })
      setForm(empty)
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] })
      toast.success('Empresa cadastrada. Envie o convite ao responsável.')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (validate()) create.mutate()
  }

  if (created) {
    return (
      <div className="max-w-3xl space-y-5">
        <PageHeader title="Empresa cadastrada" description={`${created.name} já tem cadastro. Falta o responsável ativar o acesso.`} />
        <InviteLink url={created.inviteUrl} title="Convite do responsável" />
        <div className="flex flex-wrap gap-2.5">
          <Button asChild>
            <Link to={`/admin/companies/${created.companyId}`}>Ver empresa</Link>
          </Button>
          <Button variant="secondary" onClick={() => setCreated(null)}>
            <Plus /> Cadastrar outra
          </Button>
        </div>
      </div>
    )
  }

  const cnpjOk = isValidCnpj(form.cnpj)
  const err = (key: string) => (errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null)

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-5">
      <PageHeader
        title="Nova empresa"
        description="Cada CNPJ tem um cadastro só. Informe quem a empresa indicou para gerenciar a conta: essa pessoa recebe o convite."
        actions={
          <Button asChild variant="ghost">
            <Link to="/admin/companies">
              <ArrowLeft /> Voltar
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="CNPJ" htmlFor="n-cnpj">
              <div className="relative">
                <Input id="n-cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => set('cnpj', maskCnpj(e.target.value))} aria-invalid={Boolean(errors.cnpj)} className="pr-10" />
                {cnpjOk && <CheckCircle2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-success" aria-label="CNPJ válido" />}
              </div>
              {err('cnpj')}
            </Field>
          </div>
          <Field label="Razão social" htmlFor="n-legal">
            <Input id="n-legal" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} aria-invalid={Boolean(errors.legalName)} />
            {err('legalName')}
          </Field>
          <Field label="Nome fantasia" htmlFor="n-trade" hint="É o nome que os jovens veem.">
            <Input id="n-trade" value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} aria-invalid={Boolean(errors.tradeName)} />
            {err('tradeName')}
          </Field>
          <Field label="Setor" htmlFor="n-sector">
            <Select id="n-sector" value={form.sector} onChange={(e) => set('sector', e.target.value)} aria-invalid={Boolean(errors.sector)}>
              <option value="">Selecione</option>
              {companySectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            {err('sector')}
          </Field>
          <Field label="Porte" htmlFor="n-size">
            <Select id="n-size" value={form.size} onChange={(e) => set('size', e.target.value)} aria-invalid={Boolean(errors.size)}>
              <option value="">Selecione</option>
              {companySizes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            {err('size')}
          </Field>
          <Field label="Cidade" htmlFor="n-city">
            <Input id="n-city" value={form.city} onChange={(e) => set('city', e.target.value)} aria-invalid={Boolean(errors.city)} />
            {err('city')}
          </Field>
          <Field label="Estado" htmlFor="n-state">
            <Select id="n-state" value={form.state} onChange={(e) => set('state', e.target.value)}>
              {brazilianStates.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Site (opcional)" htmlFor="n-site">
              <Input id="n-site" type="url" inputMode="url" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsável pela conta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="n-mname">
            <Input id="n-mname" autoComplete="off" value={form.managerName} onChange={(e) => set('managerName', e.target.value)} aria-invalid={Boolean(errors.managerName)} />
            {err('managerName')}
          </Field>
          <Field label="Cargo" htmlFor="n-mjob">
            <Input id="n-mjob" placeholder="Ex.: Gerente de pessoas" value={form.managerJobTitle} onChange={(e) => set('managerJobTitle', e.target.value)} aria-invalid={Boolean(errors.managerJobTitle)} />
            {err('managerJobTitle')}
          </Field>
          <Field label="E-mail" htmlFor="n-memail" hint="É o login da pessoa. Não pode ter conta no Hub+.">
            <Input id="n-memail" type="email" autoComplete="off" value={form.managerEmail} onChange={(e) => set('managerEmail', e.target.value)} aria-invalid={Boolean(errors.managerEmail)} />
            {err('managerEmail')}
          </Field>
          <Field label="Telefone com DDD" htmlFor="n-mphone">
            <Input id="n-mphone" type="tel" inputMode="tel" placeholder="(79) 99999-0000" value={form.managerPhone} onChange={(e) => set('managerPhone', maskPhone(e.target.value))} aria-invalid={Boolean(errors.managerPhone)} />
            {err('managerPhone')}
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={create.isPending}>
          Cadastrar e gerar convite
        </Button>
      </div>
    </form>
  )
}
