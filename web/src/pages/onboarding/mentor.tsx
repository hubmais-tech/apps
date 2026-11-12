import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ChipSelect, OnboardingShell, ReviewList, StepHeading } from '@/components/onboarding-shell'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { expertiseOptions } from '@/lib/options'
import { ageFrom, isValidCpf, isValidPixKey, maskCpf, maskPhone, onlyDigits, pixKeyTypes, type PixKeyType } from '@/lib/masks'

const steps = [
  { title: 'Dados pessoais', description: 'Nome completo, CPF e contato.' },
  { title: 'Recebimento', description: 'A chave Pix que recebe seus saques.' },
  { title: 'Perfil de mentor', description: 'Como os alunos vão conhecer você.' },
  { title: 'Termos e revisão', description: 'Confira e abra sua carteira.' },
]

type Form = {
  fullName: string
  cpf: string
  birthDate: string
  phone: string
  pixKeyType: PixKeyType
  pixKey: string
  bio: string
  expertise: string[]
  acceptTerms: boolean
}

/** "Abrir a carteira": obrigatório para o mentor criar cursos e receber (D13). */
export function MentorOnboarding() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<Form>({
    fullName: '',
    cpf: '',
    birthDate: '',
    phone: '',
    pixKeyType: 'cpf',
    pixKey: '',
    bio: '',
    expertise: [],
    acceptTerms: false,
  })

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: '' }))
  }

  function validate(index: number) {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (form.fullName.trim().split(/\s+/).length < 2) next.fullName = 'Informe nome e sobrenome.'
      if (!isValidCpf(form.cpf)) next.cpf = 'CPF inválido.'
      const age = form.birthDate ? ageFrom(form.birthDate) : null
      if (age === null) next.birthDate = 'Informe a data de nascimento.'
      else if (age < 18) next.birthDate = 'É preciso ter 18 anos ou mais.'
      const phone = onlyDigits(form.phone)
      if (phone.length < 10) next.phone = 'Informe o telefone com DDD.'
    }
    if (index === 1 && !isValidPixKey(form.pixKeyType, form.pixKey)) next.pixKey = 'Chave Pix inválida para o tipo escolhido.'
    if (index === 2) {
      if (form.bio.trim().length < 30) next.bio = 'Conte um pouco mais (mínimo de 30 caracteres).'
      if (form.expertise.length === 0) next.expertise = 'Escolha ao menos uma área.'
    }
    if (index === 3 && !form.acceptTerms) next.acceptTerms = 'É preciso aceitar os termos para abrir a carteira.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const open = useMutation({
    mutationFn: () =>
      api.post('/me/mentor-account', {
        fullName: form.fullName.trim(),
        cpf: form.cpf,
        birthDate: form.birthDate,
        phone: onlyDigits(form.phone),
        pixKeyType: form.pixKeyType,
        pixKey: form.pixKey.trim(),
        bio: form.bio.trim(),
        expertise: form.expertise,
        acceptTerms: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Carteira aberta! Agora você pode criar seu primeiro curso.')
      navigate('/mentor/courses', { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const next = () => validate(step) && setStep((s) => s + 1)
  const pixConfig = pixKeyTypes.find((t) => t.value === form.pixKeyType)!

  return (
    <OnboardingShell heading="Abra sua carteira de mentor" intro="Antes de criar cursos, precisamos de alguns dados para pagar você corretamente." steps={steps} current={step}>
      {step === 0 && (
        <div className="space-y-5">
          <StepHeading title="Seus dados pessoais" description="Usamos esses dados só para o repasse das suas vendas. O CPF fica protegido e nunca aparece completo para os alunos." />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome completo" htmlFor="fullName" hint="Como está no seu documento.">
                <Input id="fullName" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} aria-invalid={Boolean(errors.fullName)} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </Field>
            </div>
            <Field label="CPF" htmlFor="cpf">
              <Input id="cpf" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set('cpf', maskCpf(e.target.value))} aria-invalid={Boolean(errors.cpf)} />
              {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
            </Field>
            <Field label="Data de nascimento" htmlFor="birthDate">
              <Input id="birthDate" type="date" autoComplete="bday" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} aria-invalid={Boolean(errors.birthDate)} />
              {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate}</p>}
            </Field>
            <div className="sm:col-span-2">
              <Field label="Telefone com DDD" htmlFor="phone" hint="Usamos para falar sobre saques e dúvidas.">
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(79) 99999-0000" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} aria-invalid={Boolean(errors.phone)} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </Field>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <StepHeading title="Onde você recebe" description="Seus saques são pagos por Pix na chave abaixo. Ela precisa estar no seu nome." />
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <Field label="Tipo da chave" htmlFor="pixKeyType">
              <Select id="pixKeyType" value={form.pixKeyType} onChange={(e) => { set('pixKeyType', e.target.value as PixKeyType); set('pixKey', '') }}>
                {pixKeyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Chave Pix" htmlFor="pixKey">
              <Input
                id="pixKey"
                placeholder={pixConfig.placeholder}
                value={form.pixKey}
                onChange={(e) => set('pixKey', form.pixKeyType === 'cpf' ? maskCpf(e.target.value) : form.pixKeyType === 'phone' ? maskPhone(e.target.value) : e.target.value)}
                aria-invalid={Boolean(errors.pixKey)}
              />
              {errors.pixKey && <p className="text-xs text-destructive">{errors.pixKey}</p>}
            </Field>
          </div>
          {form.pixKeyType === 'cpf' && isValidCpf(form.cpf) && form.pixKey !== form.cpf && (
            <Button type="button" variant="soft" size="sm" onClick={() => set('pixKey', form.cpf)}>
              Usar o CPF que informei
            </Button>
          )}
          <p className="flex gap-2 rounded-lg bg-sand-soft p-3 text-[13px] text-warning">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Confira a chave com atenção. Você pode trocá-la depois em Configurações.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <StepHeading title="Seu perfil de mentor" description="Aparece na página dos seus cursos." />
          <Field label="Sobre você" htmlFor="bio" hint={`${form.bio.trim().length}/600 caracteres. Fale da sua experiência e do que você ensina.`}>
            <Textarea id="bio" maxLength={600} value={form.bio} onChange={(e) => set('bio', e.target.value)} aria-invalid={Boolean(errors.bio)} />
            {errors.bio && <p className="text-xs text-destructive">{errors.bio}</p>}
          </Field>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Áreas em que você atua (até 6)</p>
            <ChipSelect label="Áreas de atuação" options={expertiseOptions} value={form.expertise} onChange={(v) => set('expertise', v)} max={6} />
            {errors.expertise && <p className="text-xs text-destructive">{errors.expertise}</p>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <StepHeading title="Revise e aceite os termos" description="Depois de aberta, a carteira libera a criação de cursos e o painel de vendas." />
          <ReviewList
            items={[
              { label: 'Nome', value: form.fullName },
              { label: 'CPF', value: form.cpf },
              { label: 'Nascimento', value: form.birthDate.split('-').reverse().join('/') },
              { label: 'Telefone', value: form.phone },
              { label: 'Chave Pix', value: `${pixConfig.label}: ${form.pixKey}` },
              { label: 'Áreas', value: form.expertise.join(', ') },
            ]}
          />
          <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-muted-foreground">
            <li>As vendas ficam pendentes por 7 dias (garantia do aluno) e depois ficam disponíveis para saque.</li>
            <li>Do valor de cada venda, o Hub+ retém uma parte e a taxa do meio de pagamento (estimada) também é descontada. Ao definir o preço de um curso, você vê exatamente quanto fica com você.</li>
            <li>Os saques são pagos por Pix na chave cadastrada, em até 2 dias úteis.</li>
          </ul>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={form.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} />
            <span>Li e aceito os termos de mentoria e de repasse do Hub+, e confirmo que os dados acima são verdadeiros.</span>
          </label>
          {errors.acceptTerms && <p className="text-xs text-destructive">{errors.acceptTerms}</p>}
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
          <Button type="button" loading={open.isPending} onClick={() => validate(3) && open.mutate()}>
            Abrir minha carteira
          </Button>
        )}
      </div>
    </OnboardingShell>
  )
}
