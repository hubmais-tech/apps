import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Crown, KeyRound, Link2, Mail, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ChipSelect } from '@/components/onboarding-shell'
import { ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage, type Company, type MentorAccount, type StudentProfile } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isValidPixKey, maskCnpj, maskCpf, maskPhone, onlyDigits, pixKeyTypes, type PixKeyType } from '@/lib/masks'
import { brazilianStates, companySectors, companySizes, expertiseOptions, goalOptions, interestOptions } from '@/lib/options'
import { cn } from '@/lib/utils'

const roleLabel = { student: 'Aluno', mentor: 'Mentor', company: 'Empresa', admin: 'Admin' } as const

function Tabs({ tabs, current, onChange }: { tabs: { id: string; label: string }[]; current: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={current === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn('-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground', current === tab.id && 'border-primary font-semibold text-primary')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function AccountCard() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conta de acesso</CardTitle>
        <Badge variant="primary">{roleLabel[user.role]}</Badge>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="acc-name">
          <Input id="acc-name" value={user.name} readOnly />
        </Field>
        <Field label="E-mail" htmlFor="acc-email" hint="O e-mail é o seu login.">
          <Input id="acc-email" value={user.email} readOnly />
        </Field>
      </CardContent>
    </Card>
  )
}

function SaveBar({ loading, label = 'Salvar alterações' }: { loading: boolean; label?: string }) {
  return (
    <div className="flex justify-end border-t border-border pt-4">
      <Button type="submit" loading={loading}>
        {label}
      </Button>
    </div>
  )
}

// ---------- Aluno ----------
function StudentSettings() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['student-profile'],
    queryFn: async () => (await api.get<StudentProfile>('/me/student-profile')).data,
  })
  const [form, setForm] = useState<StudentProfile | null>(null)
  useEffect(() => {
    if (query.data) setForm(query.data)
  }, [query.data])

  const save = useMutation({
    mutationFn: (value: StudentProfile) =>
      api.put('/me/student-profile', {
        birthDate: value.birthDate || null,
        city: value.city,
        neighborhood: value.neighborhood,
        phone: value.phone,
        interests: value.interests,
        goal: value.goal,
        headline: value.headline,
        bio: value.bio,
        complete: true,
      }),
    onSuccess: () => {
      toast.success('Perfil atualizado.')
      queryClient.invalidateQueries({ queryKey: ['student-profile'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading || !form) return <Loading />
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />
  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => setForm({ ...form, [key]: value })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate(form!)
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Seu perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cidade" htmlFor="s-city">
              <Input id="s-city" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Bairro" htmlFor="s-neighborhood">
              <Input id="s-neighborhood" value={form.neighborhood ?? ''} onChange={(e) => set('neighborhood', e.target.value)} />
            </Field>
            <Field label="Data de nascimento" htmlFor="s-birth">
              <Input id="s-birth" type="date" value={form.birthDate ?? ''} onChange={(e) => set('birthDate', e.target.value)} />
            </Field>
            <Field label="WhatsApp" htmlFor="s-phone">
              <Input id="s-phone" type="tel" value={form.phone ?? ''} onChange={(e) => set('phone', maskPhone(e.target.value))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Título do perfil" htmlFor="s-headline" hint="Aparece no Banco de Talentos. Ex.: Social media e criação de conteúdo.">
                <Input id="s-headline" maxLength={120} value={form.headline ?? ''} onChange={(e) => set('headline', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Sobre você" htmlFor="s-bio" hint={`${(form.bio ?? '').length}/600 caracteres`}>
                <Textarea id="s-bio" maxLength={600} value={form.bio ?? ''} onChange={(e) => set('bio', e.target.value)} />
              </Field>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Interesses</p>
            <ChipSelect label="Interesses" options={interestOptions} value={form.interests} onChange={(v) => set('interests', v)} max={12} />
          </div>
          <Field label="Objetivo" htmlFor="s-goal">
            <Select id="s-goal" value={form.goal ?? ''} onChange={(e) => set('goal', e.target.value || null)}>
              <option value="">Não informar</option>
              {goalOptions.map((goal) => (
                <option key={goal.value} value={goal.value}>
                  {goal.label}
                </option>
              ))}
            </Select>
          </Field>
          <SaveBar loading={save.isPending} />
        </CardContent>
      </Card>
    </form>
  )
}

// ---------- Mentor ----------
function MentorSettings() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['mentor-account'],
    queryFn: async () => (await api.get<MentorAccount>('/me/mentor-account')).data,
  })
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [expertise, setExpertise] = useState<string[]>([])
  const [changingPix, setChangingPix] = useState(false)
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf')
  const [pixKey, setPixKey] = useState('')

  useEffect(() => {
    if (query.data) {
      setPhone(maskPhone(query.data.phone))
      setBio(query.data.bio)
      setExpertise(query.data.expertise)
    }
  }, [query.data])

  const save = useMutation({
    mutationFn: () =>
      api.patch('/me/mentor-account', {
        phone: onlyDigits(phone),
        bio: bio.trim(),
        expertise,
        ...(changingPix ? { pixKeyType, pixKey: pixKey.trim() } : {}),
      }),
    onSuccess: () => {
      toast.success('Dados da carteira atualizados.')
      setChangingPix(false)
      setPixKey('')
      queryClient.invalidateQueries({ queryKey: ['mentor-account'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />
  const account = query.data
  const pixConfig = pixKeyTypes.find((t) => t.value === pixKeyType)!

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (changingPix && !isValidPixKey(pixKeyType, pixKey)) {
      toast.error('Chave Pix inválida para o tipo escolhido.')
      return
    }
    save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Dados da carteira</CardTitle>
          <Badge variant="success">Carteira aberta</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nome completo" htmlFor="m-name">
              <Input id="m-name" value={account.fullName} readOnly />
            </Field>
            <Field label="CPF" htmlFor="m-cpf">
              <Input id="m-cpf" value={account.cpfMasked} readOnly />
            </Field>
            <Field label="Nascimento" htmlFor="m-birth">
              <Input id="m-birth" value={account.birthDate.split('-').reverse().join('/')} readOnly />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Nome, CPF e nascimento não podem ser alterados aqui. Para corrigir, fale com o time do Hub+.</p>
          <Field label="Telefone com DDD" htmlFor="m-phone">
            <Input id="m-phone" type="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} />
          </Field>
          <Field label="Sobre você" htmlFor="m-bio" hint={`${bio.length}/600 caracteres`}>
            <Textarea id="m-bio" maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold">Áreas de atuação</p>
            <ChipSelect label="Áreas de atuação" options={expertiseOptions} value={expertise} onChange={setExpertise} max={6} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recebimento por Pix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-faint p-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary">
                <KeyRound className="size-4" />
              </span>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold">{pixKeyTypes.find((t) => t.value === account.pixKeyType)?.label}</p>
                <p className="text-xs text-muted-foreground">{account.pixKeyMasked}</p>
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setChangingPix((v) => !v)}>
              {changingPix ? 'Cancelar troca' : 'Trocar chave'}
            </Button>
          </div>
          {changingPix && (
            <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
              <Field label="Tipo da chave" htmlFor="m-pix-type">
                <Select id="m-pix-type" value={pixKeyType} onChange={(e) => { setPixKeyType(e.target.value as PixKeyType); setPixKey('') }}>
                  {pixKeyTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nova chave Pix" htmlFor="m-pix-key" hint="A conta precisa estar no seu nome.">
                <Input id="m-pix-key" placeholder={pixConfig.placeholder} value={pixKey} onChange={(e) => setPixKey(pixKeyType === 'cpf' ? maskCpf(e.target.value) : pixKeyType === 'phone' ? maskPhone(e.target.value) : e.target.value)} />
              </Field>
            </div>
          )}
          <SaveBar loading={save.isPending} />
        </CardContent>
      </Card>
    </form>
  )
}

// ---------- Empresa ----------
function CompanyData({ company }: { company: Company }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    legalName: company.legalName,
    tradeName: company.tradeName,
    sector: company.sector,
    size: company.size,
    city: company.city,
    state: company.state,
    website: company.website ?? '',
    about: company.about ?? '',
  })
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value })

  const save = useMutation({
    mutationFn: () => {
      const { legalName: _legalName, ...editable } = form
      return api.patch('/company', { ...editable, website: form.website || null, about: form.about || null })
    },
    onSuccess: () => {
      toast.success('Dados da empresa atualizados.')
      queryClient.invalidateQueries({ queryKey: ['company'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CNPJ" htmlFor="c-cnpj" hint="Só o Hub+ altera o CNPJ e a razão social. Se algo estiver errado, fale com o Hub+.">
              <Input id="c-cnpj" value={maskCnpj(company.cnpj)} readOnly />
            </Field>
            <Field label="Razão social" htmlFor="c-legal">
              <Input id="c-legal" value={form.legalName} readOnly />
            </Field>
            <Field label="Nome fantasia" htmlFor="c-trade">
              <Input id="c-trade" value={form.tradeName} onChange={(e) => set('tradeName', e.target.value)} />
            </Field>
            <Field label="Setor" htmlFor="c-sector">
              <Select id="c-sector" value={form.sector} onChange={(e) => set('sector', e.target.value)}>
                {[...new Set([form.sector, ...companySectors])].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Porte" htmlFor="c-size">
              <Select id="c-size" value={form.size} onChange={(e) => set('size', e.target.value)}>
                {companySizes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Site" htmlFor="c-site">
              <Input id="c-site" type="url" placeholder="https://" value={form.website} onChange={(e) => set('website', e.target.value)} />
            </Field>
            <Field label="Cidade" htmlFor="c-city">
              <Input id="c-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="Estado" htmlFor="c-state">
              <Select id="c-state" value={form.state} onChange={(e) => set('state', e.target.value)}>
                {brazilianStates.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Sobre a empresa" htmlFor="c-about" hint="Aparece para os jovens quando você envia convites.">
                <Textarea id="c-about" maxLength={800} value={form.about} onChange={(e) => set('about', e.target.value)} />
              </Field>
            </div>
          </div>
          <SaveBar loading={save.isPending} />
        </CardContent>
      </Card>
    </form>
  )
}

const memberStatus = {
  active: { label: 'Com acesso', variant: 'success' },
  pending: { label: 'Convite enviado', variant: 'accent' },
  expired: { label: 'Convite vencido', variant: 'destructive' },
} as const

function CompanyTeam({ company }: { company: Company }) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', jobTitle: '', email: '', phone: '' })
  const [invite, setInvite] = useState<{ memberId: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [handing, setHanding] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company'] })

  const add = useMutation({
    mutationFn: async () =>
      (await api.post<{ memberId: string; inviteUrl: string }>('/company/members', { ...form, phone: onlyDigits(form.phone) || undefined })).data,
    onSuccess: (data) => {
      setInvite({ memberId: data.memberId, url: data.inviteUrl })
      setForm({ name: '', jobTitle: '', email: '', phone: '' })
      setAdding(false)
      toast.success('Representante cadastrado. Copie o link do convite.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const reissue = useMutation({
    mutationFn: async (memberId: string) => ({ memberId, url: (await api.post<{ inviteUrl: string }>(`/company/members/${memberId}/invite`)).data.inviteUrl }),
    onSuccess: (data) => {
      setInvite(data)
      toast.success('Novo link gerado. O anterior deixou de valer.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  // D23: a empresa escolhe quem gerencia a conta. Depois da troca, esta pessoa vira representante comum.
  const handOver = useMutation({
    mutationFn: (memberId: string) => api.post('/company/manager', { memberId }),
    onSuccess: () => {
      setHanding(null)
      toast.success('Gestão da conta passada. Você agora é representante comum.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (memberId: string) => api.delete(`/company/members/${memberId}`),
    onSuccess: () => {
      toast.success('Representante removido.')
      refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.')
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    add.mutate()
  }

  return (
    <div className="space-y-5">
      {invite && (
        <Card className="border-primary">
          <CardContent className="space-y-3 pt-[18px]">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Link2 className="size-4 text-primary" /> Link de convite
            </div>
            <p className="text-[13px] text-muted-foreground">Envie este link para a pessoa. Ele vale por 7 dias e só pode ser usado uma vez. Ainda não enviamos e-mails automaticamente.</p>
            <div className="flex gap-2">
              <Input aria-label="Link de convite" readOnly value={invite.url} onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="secondary" onClick={() => copy(invite.url)}>
                {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Representantes</CardTitle>
          {company.isOwner && (
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              <UserPlus /> Adicionar
            </Button>
          )}
        </CardHeader>

        {adding && (
          <form onSubmit={onSubmit} className="grid gap-4 border-b border-border bg-faint p-[18px] sm:grid-cols-2">
            <Field label="Nome completo" htmlFor="t-name">
              <Input id="t-name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Cargo" htmlFor="t-job">
              <Input id="t-job" required minLength={2} value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </Field>
            <Field label="E-mail" htmlFor="t-email" hint="É o login da pessoa.">
              <Input id="t-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Telefone (opcional)" htmlFor="t-phone">
              <Input id="t-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={add.isPending}>
                <Plus /> Cadastrar e gerar convite
              </Button>
            </div>
          </form>
        )}

        <ul>
          {company.members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
              <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-lilac-soft text-xs font-semibold text-primary">
                {member.name
                  .split(' ')
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('')}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                  {member.name} {member.isPrimary && <Badge variant="primary">Responsável</Badge>}
                </p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  {member.jobTitle} · <Mail className="size-3" /> {member.email}
                </p>
              </div>
              <Badge variant={memberStatus[member.status].variant}>{memberStatus[member.status].label}</Badge>
              {company.isOwner && !member.isPrimary && (
                <div className="flex items-center gap-1">
                  {member.status === 'active' &&
                    (handing === member.id ? (
                      <>
                        <Button type="button" size="sm" loading={handOver.isPending} onClick={() => handOver.mutate(member.id)}>
                          Confirmar troca
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setHanding(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" variant="secondary" onClick={() => setHanding(member.id)}>
                        <Crown /> Tornar responsável
                      </Button>
                    ))}
                  {member.status !== 'active' && (
                    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Gerar novo convite para ${member.name}`} onClick={() => reissue.mutate(member.id)}>
                      <RefreshCw />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-destructive" aria-label={`Remover ${member.name}`} onClick={() => remove.mutate(member.id)}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {company.isOwner ? (
          <p className="border-t border-border px-[18px] py-3 text-xs text-muted-foreground">Você é o responsável pela conta. Para passar a gestão a outra pessoa, ela precisa ter ativado o acesso. Se você sair da empresa, avise o Hub+.</p>
        ) : (
          <p className="border-t border-border px-[18px] py-3 text-xs text-muted-foreground">Só o responsável pela conta adiciona, remove ou troca representantes.</p>
        )}
      </Card>
    </div>
  )
}

function CompanySettings({ tab }: { tab: string }) {
  const query = useQuery({
    queryKey: ['company'],
    queryFn: async () => (await api.get<Company>('/company')).data,
  })
  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />
  return tab === 'team' ? <CompanyTeam company={query.data} /> : <CompanyData company={query.data} />
}

export function SettingsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  if (!user) return null

  const tabs =
    user.role === 'company'
      ? [
          { id: 'company', label: 'Empresa' },
          { id: 'team', label: 'Equipe' },
          { id: 'account', label: 'Conta' },
        ]
      : user.role === 'mentor'
        ? [
            { id: 'wallet', label: 'Carteira' },
            { id: 'account', label: 'Conta' },
          ]
        : user.role === 'student'
          ? [
              { id: 'profile', label: 'Perfil' },
              { id: 'account', label: 'Conta' },
            ]
          : [{ id: 'account', label: 'Conta' }]

  const requested = params.get('tab')
  const tab = tabs.find((t) => t.id === requested)?.id ?? tabs[0]!.id

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" description="Seus dados, preferências e acesso." />
      <Tabs tabs={tabs} current={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />
      {tab === 'account' && <AccountCard />}
      {tab === 'profile' && <StudentSettings />}
      {tab === 'wallet' && <MentorSettings />}
      {(tab === 'company' || tab === 'team') && <CompanySettings tab={tab} />}
    </div>
  )
}
