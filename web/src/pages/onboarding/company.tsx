import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { OnboardingShell, ReviewList, StepHeading } from '@/components/onboarding-shell'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isValidCnpj, maskCnpj, maskPhone, onlyDigits } from '@/lib/masks'
import { brazilianStates, companySectors, companySizes } from '@/lib/options'

const steps = [
  { title: 'Dados da empresa', description: 'CNPJ, nome e porte.' },
  { title: 'Representante', description: 'Quem acessa o Hub+ pela empresa.' },
  { title: 'Revisão', description: 'Confira e conclua o cadastro.' },
]

/** Cadastro da empresa: CNPJ, dados e representante principal (D14). */
export function CompanyOnboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    cnpj: '',
    legalName: '',
    tradeName: '',
    sector: '',
    size: '',
    city: 'Aracaju',
    state: 'SE',
    website: '',
    jobTitle: '',
    phone: '',
  })
  const set = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate(index: number) {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (!isValidCnpj(form.cnpj)) next.cnpj = 'CNPJ inválido.'
      if (form.legalName.trim().length < 3) next.legalName = 'Informe a razão social.'
      if (form.tradeName.trim().length < 2) next.tradeName = 'Informe o nome fantasia.'
      if (!form.sector) next.sector = 'Escolha o setor.'
      if (!form.size) next.size = 'Escolha o porte.'
      if (form.city.trim().length < 2) next.city = 'Informe a cidade.'
    }
    if (index === 1) {
      if (form.jobTitle.trim().length < 2) next.jobTitle = 'Informe seu cargo.'
      if (onlyDigits(form.phone).length < 10) next.phone = 'Informe o telefone com DDD.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const create = useMutation({
    mutationFn: () =>
      api.post('/company', {
        cnpj: form.cnpj,
        legalName: form.legalName.trim(),
        tradeName: form.tradeName.trim(),
        sector: form.sector,
        size: form.size,
        city: form.city.trim(),
        state: form.state,
        website: form.website.trim() || null,
        representative: { jobTitle: form.jobTitle.trim(), phone: onlyDigits(form.phone) },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Empresa cadastrada!')
      navigate('/', { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const next = () => validate(step) && setStep((s) => s + 1)
  const cnpjOk = isValidCnpj(form.cnpj)

  return (
    <OnboardingShell heading="Cadastre sua empresa" intro="Com o cadastro completo, você acessa o Banco de Talentos e convida jovens para suas vagas." steps={steps} current={step}>
      {step === 0 && (
        <div className="space-y-5">
          <StepHeading title="Dados da empresa" description="Usamos o CNPJ para identificar a empresa. Cada CNPJ tem um cadastro só." />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="CNPJ" htmlFor="cnpj">
                <div className="relative">
                  <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => set('cnpj', maskCnpj(e.target.value))} aria-invalid={Boolean(errors.cnpj)} className="pr-10" />
                  {cnpjOk && <CheckCircle2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-success" aria-label="CNPJ válido" />}
                </div>
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
              </Field>
            </div>
            <Field label="Razão social" htmlFor="legalName">
              <Input id="legalName" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} aria-invalid={Boolean(errors.legalName)} />
              {errors.legalName && <p className="text-xs text-destructive">{errors.legalName}</p>}
            </Field>
            <Field label="Nome fantasia" htmlFor="tradeName" hint="É o nome que os jovens veem.">
              <Input id="tradeName" value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} aria-invalid={Boolean(errors.tradeName)} />
              {errors.tradeName && <p className="text-xs text-destructive">{errors.tradeName}</p>}
            </Field>
            <Field label="Setor" htmlFor="sector">
              <Select id="sector" value={form.sector} onChange={(e) => set('sector', e.target.value)} aria-invalid={Boolean(errors.sector)}>
                <option value="">Selecione</option>
                {companySectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              {errors.sector && <p className="text-xs text-destructive">{errors.sector}</p>}
            </Field>
            <Field label="Porte" htmlFor="size">
              <Select id="size" value={form.size} onChange={(e) => set('size', e.target.value)} aria-invalid={Boolean(errors.size)}>
                <option value="">Selecione</option>
                {companySizes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {errors.size && <p className="text-xs text-destructive">{errors.size}</p>}
            </Field>
            <Field label="Cidade" htmlFor="city">
              <Input id="city" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} aria-invalid={Boolean(errors.city)} />
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </Field>
            <Field label="Estado" htmlFor="state">
              <Select id="state" value={form.state} onChange={(e) => set('state', e.target.value)}>
                {brazilianStates.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Site (opcional)" htmlFor="website">
                <Input id="website" type="url" inputMode="url" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <StepHeading title="Representante principal" description="Você é o primeiro representante da empresa. Depois, convide outras pessoas em Configurações, na aba Equipe." />
          <ReviewList items={[{ label: 'Nome', value: user?.name }, { label: 'E-mail', value: user?.email }]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seu cargo" htmlFor="jobTitle">
              <Input id="jobTitle" placeholder="Ex.: Gerente de pessoas" value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} aria-invalid={Boolean(errors.jobTitle)} />
              {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle}</p>}
            </Field>
            <Field label="Telefone com DDD" htmlFor="phone">
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(79) 99999-0000" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} aria-invalid={Boolean(errors.phone)} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </Field>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <StepHeading title="Confira os dados" description="Depois de concluído, o CNPJ não pode ser alterado." />
          <ReviewList
            items={[
              { label: 'CNPJ', value: form.cnpj },
              { label: 'Razão social', value: form.legalName },
              { label: 'Nome fantasia', value: form.tradeName },
              { label: 'Setor e porte', value: `${form.sector} · ${companySizes.find((s) => s.value === form.size)?.label ?? ''}` },
              { label: 'Local', value: `${form.city}/${form.state}` },
              { label: 'Representante', value: `${user?.name} · ${form.jobTitle}` },
              { label: 'Contato', value: form.phone },
            ]}
          />
        </div>
      )}

      <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft /> Voltar
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={next}>
            Continuar <ArrowRight />
          </Button>
        ) : (
          <Button type="button" loading={create.isPending} onClick={() => create.mutate()}>
            Concluir cadastro
          </Button>
        )}
      </div>
    </OnboardingShell>
  )
}
