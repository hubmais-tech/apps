import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Briefcase, Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ChipSelect, OnboardingShell, StepHeading } from '@/components/onboarding-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'
import { maskPhone, onlyDigits } from '@/lib/masks'
import { goalOptions, interestOptions } from '@/lib/options'
import { cn } from '@/lib/utils'

const steps = [
  { title: 'Sobre você', description: 'Onde você mora e como falar com você.' },
  { title: 'Interesses', description: 'O que você quer aprender e por quê.' },
  { title: 'Pronto', description: 'Seu perfil e o Banco de Talentos.' },
]

/** Onboarding leve e pulável do aluno. Sem CPF (D12). */
export function StudentOnboarding() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    birthDate: '',
    city: 'Aracaju',
    neighborhood: '',
    phone: '',
    interests: [] as string[],
    goal: '' as string,
  })
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function finish() {
    await queryClient.invalidateQueries({ queryKey: ['me'] })
    navigate('/painel', { replace: true })
  }

  const skip = useMutation({
    mutationFn: () => api.post('/me/student-profile/skip'),
    onSuccess: finish,
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const save = useMutation({
    mutationFn: () =>
      api.put('/me/student-profile', {
        birthDate: form.birthDate || null,
        city: form.city,
        neighborhood: form.neighborhood,
        phone: onlyDigits(form.phone) ? maskPhone(form.phone) : null,
        interests: form.interests,
        goal: form.goal || null,
        complete: true,
      }),
    onSuccess: async () => {
      toast.success('Perfil salvo. Bons estudos!')
      await finish()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <OnboardingShell heading="Vamos montar seu perfil" intro="Leva 1 minuto e ajuda a indicar os cursos certos. Tudo aqui é opcional." steps={steps} current={step}>
      {step === 0 && (
        <div className="space-y-5">
          <StepHeading title="Sobre você" description="Não pedimos CPF. Só o que ajuda a conhecer você." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cidade" htmlFor="city">
              <Input id="city" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Bairro" htmlFor="neighborhood">
              <Input id="neighborhood" placeholder="Ex.: Atalaia" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            </Field>
            <Field label="Data de nascimento" htmlFor="birthDate">
              <Input id="birthDate" type="date" autoComplete="bday" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
            </Field>
            <Field label="WhatsApp" htmlFor="phone" hint="Só aparece para empresas se você aceitar um convite.">
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(79) 99999-0000" value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <StepHeading title="O que você quer aprender?" description="Escolha quantos quiser." />
          <ChipSelect label="Interesses" options={interestOptions} value={form.interests} onChange={(v) => set('interests', v)} max={12} />
          <fieldset className="space-y-2.5">
            <legend className="mb-1 text-[13px] font-semibold">Qual é o seu objetivo agora?</legend>
            {goalOptions.map((goal) => (
              <label
                key={goal.value}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-faint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                  form.goal === goal.value && 'border-primary bg-primary-soft shadow-[inset_0_0_0_1px_var(--primary)] hover:bg-primary-soft',
                )}
              >
                <input type="radio" name="goal" value={goal.value} checked={form.goal === goal.value} onChange={() => set('goal', goal.value)} className="sr-only" />
                <span className="min-w-0 flex-1 leading-snug">
                  <b className="block text-sm font-semibold">{goal.label}</b>
                  <span className="text-[13px] text-muted-foreground">{goal.text}</span>
                </span>
                {form.goal === goal.value && <Check className="size-4 text-primary" />}
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <StepHeading title="Tudo pronto!" description="Você já pode explorar os cursos." />
          <div className="flex gap-3 rounded-lg border border-border bg-faint p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-soft text-orange">
              <Briefcase className="size-[18px]" />
            </span>
            <div className="text-[13px]">
              <b className="font-semibold">Seu caminho até o Banco de Talentos</b>
              <p className="mt-1 text-muted-foreground">Conclua um curso, entregue os desafios e monte seu portfólio. Quando tiver um projeto validado por um mentor, você pode aparecer para empresas de Aracaju e região.</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        {step === 0 ? (
          <Button type="button" variant="ghost" loading={skip.isPending} onClick={() => skip.mutate()}>
            Pular por agora
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft /> Voltar
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            Continuar <ArrowRight />
          </Button>
        ) : (
          <Button type="button" loading={save.isPending} onClick={() => save.mutate()}>
            Concluir e explorar cursos
          </Button>
        )}
      </div>
    </OnboardingShell>
  )
}
