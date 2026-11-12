import { useMutation } from '@tanstack/react-query'
import { ArrowRight, ImageIcon, LayoutList, Rocket } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { EarningsPreview } from '@/components/earnings-preview'
import { PageHeader } from '@/components/query-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage } from '@/lib/api'

const next = [
  { icon: ImageIcon, title: 'Capa', text: 'Arraste uma imagem 16:9.' },
  { icon: LayoutList, title: 'Conteúdo', text: 'Crie módulos e arraste os vídeos das aulas.' },
  { icon: Rocket, title: 'Publicar', text: 'Revise a lista e coloque no catálogo.' },
]

/** Primeiro passo: cria o rascunho com o essencial. O resto fica no construtor. */
export function NewCoursePage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const cents = Math.round(Number(price.replace(/\./g, '').replace(',', '.')) * 100)
  const priceInvalid = price !== '' && (Number.isNaN(cents) || cents < 500)

  const create = useMutation({
    mutationFn: async () => (await api.post<{ courseId: string }>('/courses', { title: title.trim(), description: description.trim() || undefined, priceInCents: cents })).data,
    onSuccess: ({ courseId }) => {
      toast.success('Rascunho criado. Agora adicione a capa e o conteúdo.')
      navigate(`/mentor/courses/${courseId}?step=cover`, { replace: true })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!priceInvalid) create.mutate()
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo curso" description="Comece pelo essencial. Você pode mudar tudo depois." />

      <div className="grid gap-5 md:grid-cols-[1fr_240px]">
        <Card>
          <CardContent className="pt-[18px]">
            <form onSubmit={onSubmit} className="space-y-5">
              <Field label="Título do curso" htmlFor="n-title" hint="Seja direto. Ex.: Social media na prática.">
                <Input id="n-title" required minLength={3} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Descrição" htmlFor="n-desc" hint="Diga o que o aluno vai aprender e fazer. Opcional agora.">
                <Textarea id="n-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field label="Preço (R$)" htmlFor="n-price" hint="Mínimo de R$ 5,00.">
                <Input id="n-price" inputMode="decimal" required placeholder="99,90" className="max-w-48" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={priceInvalid} />
                {priceInvalid && <p className="text-xs text-destructive">O preço mínimo é R$ 5,00.</p>}
              </Field>
              <EarningsPreview priceInCents={cents} />
              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <Button type="button" variant="ghost" asChild>
                  <Link to="/mentor/courses">Cancelar</Link>
                </Button>
                <Button type="submit" loading={create.isPending} disabled={priceInvalid}>
                  Criar e continuar <ArrowRight />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Em seguida</p>
          {next.map(({ icon: Icon, title: t, text }) => (
            <div key={t} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <span className="leading-tight">
                <b className="block text-[13px] font-semibold">{t}</b>
                <span className="text-xs text-muted-foreground">{text}</span>
              </span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
