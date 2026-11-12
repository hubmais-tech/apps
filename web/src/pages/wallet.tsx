import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Clock, HelpCircle, Landmark, Receipt, RotateCcw, ShoppingBag, Wallet as WalletIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader, Stat } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { api, getErrorMessage, type MentorAccount, type WalletData, type WalletEntry, type Withdrawal } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

const entryMeta: Record<WalletEntry['type'], { label: string; icon: typeof Receipt; tone: string }> = {
  sale: { label: 'Venda', icon: ShoppingBag, tone: 'bg-mint-soft text-success' },
  platform_fee: { label: 'Retenção do Hub+', icon: Landmark, tone: 'bg-mint-soft text-success' },
  refund: { label: 'Reembolso', icon: RotateCcw, tone: 'bg-destructive/12 text-destructive' },
  withdrawal: { label: 'Saque', icon: ArrowUpRight, tone: 'bg-primary-soft text-primary' },
  withdrawal_reversal: { label: 'Saque recusado', icon: ArrowDownLeft, tone: 'bg-sand-soft text-warning' },
}

const withdrawalStatus: Record<Withdrawal['status'], { label: string; variant: 'accent' | 'success' | 'destructive' }> = {
  requested: { label: 'Em análise', variant: 'accent' },
  paid: { label: 'Pago', variant: 'success' },
  rejected: { label: 'Recusado', variant: 'destructive' },
}

/** Mesma tela para o mentor (scope "me") e para o admin (scope "platform", carteira do Hub+). */
export function WalletPage({ scope }: { scope: 'me' | 'platform' }) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixKeyType, setPixKeyType] = useState('cpf')

  const wallet = useQuery({
    queryKey: ['wallet', scope],
    queryFn: async () => (await api.get<WalletData>('/wallet', { params: { scope } })).data,
  })

  // O mentor saca para a chave cadastrada ao abrir a carteira (D13). O admin informa a chave do Hub+.
  const account = useQuery({
    queryKey: ['mentor-account'],
    enabled: scope === 'me',
    queryFn: async () => (await api.get<MentorAccount>('/me/mentor-account')).data,
  })

  const withdraw = useMutation({
    mutationFn: () =>
      api.post('/wallet/withdrawals', {
        scope,
        amountInCents: Math.round(Number(amount.replace(',', '.')) * 100),
        ...(scope === 'platform' ? { pixKey, pixKeyType } : {}),
      }),
    onSuccess: () => {
      toast.success('Saque solicitado. Você será avisado quando o Pix for enviado.')
      setAmount('')
      queryClient.invalidateQueries({ queryKey: ['wallet', scope] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (wallet.isLoading) return <Loading />
  if (wallet.isError || !wallet.data) return <ErrorState onRetry={() => wallet.refetch()} />

  const data = wallet.data
  const isPlatform = scope === 'platform'
  const earned = data.entries.filter((e) => (e.type === 'sale' || e.type === 'platform_fee') && e.amountInCents > 0).reduce((sum, e) => sum + e.amountInCents, 0)
  const inReview = data.withdrawals.filter((w) => w.status === 'requested').reduce((sum, w) => sum + w.amountInCents, 0)
  const canWithdraw = data.availableInCents >= data.minimumWithdrawalInCents

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    withdraw.mutate()
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isPlatform ? 'Carteira do Hub+' : 'Carteira'}
        description={isPlatform ? 'Retenções do Hub+ sobre as vendas de cursos. Valores em reais.' : 'Suas vendas e saques. Valores em reais.'}
        actions={
          canWithdraw ? (
            <Button asChild>
              <a href="#saque">
                <Landmark /> Solicitar saque
              </a>
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Disponível para saque" value={formatCurrency(data.availableInCents)} icon={WalletIcon} tone="success" hint={canWithdraw ? 'Pronto para Pix' : `Mínimo de ${formatCurrency(data.minimumWithdrawalInCents)}`} />
        <Stat label="Pendente" value={formatCurrency(data.pendingInCents)} icon={Clock} tone="warning" hint={`Libera ${data.holdDays} dias após a compra`} />
        <Stat label="Em análise para saque" value={formatCurrency(inReview)} icon={ArrowUpRight} hint={inReview ? 'O Hub+ faz o Pix por fora' : 'Nenhum saque em análise'} />
        <Stat label={isPlatform ? 'Total retido' : 'Total vendido'} value={formatCurrency(earned)} icon={Receipt} tone="orange" hint={`${data.entries.filter((e) => e.type === 'sale' || e.type === 'platform_fee').length} lançamentos`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="space-y-5 lg:col-span-8" aria-labelledby="entries-title">
          <Card>
            <CardHeader>
              <CardTitle id="entries-title">Extrato</CardTitle>
              <span className="text-xs text-muted-foreground">{data.entries.length} {data.entries.length === 1 ? 'lançamento' : 'lançamentos'}</span>
            </CardHeader>
            {data.entries.length === 0 ? (
              <CardContent>
                <EmptyState className="border-0 py-8">Nenhuma movimentação ainda.</EmptyState>
              </CardContent>
            ) : (
              <ul>
                {data.entries.map((entry) => {
                  const meta = entryMeta[entry.type]
                  const pending = new Date(entry.availableAt) > new Date()
                  return (
                    <li key={entry.id} className="flex items-center gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
                      <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-lg', meta.tone)}>
                        <meta.icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="text-[13px] font-semibold">{meta.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.description && entry.description !== meta.label ? `${entry.description} · ` : ''}
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                      <p className={cn('text-right text-[13px] font-semibold tabular', entry.amountInCents < 0 ? 'text-foreground' : 'text-success')}>
                        {entry.amountInCents > 0 ? '+ ' : '− '}
                        {formatCurrency(Math.abs(entry.amountInCents))}
                        {pending && entry.amountInCents > 0 && <small className="block text-[11px] font-normal text-muted-foreground">Libera em {formatDate(entry.availableAt)}</small>}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </section>

        <div className="space-y-5 lg:col-span-4">
          <Card id="saque" className="scroll-mt-20">
            <CardHeader>
              <CardTitle>Sacar via Pix</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-3.5">
                <Field label="Valor (R$)" htmlFor="amount" hint={`Mínimo de ${formatCurrency(data.minimumWithdrawalInCents)}`}>
                  <Input id="amount" inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                {isPlatform ? (
                  <>
                <Field label="Tipo da chave" htmlFor="pixKeyType">
                  <Select id="pixKeyType" value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)}>
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave aleatória</option>
                  </Select>
                </Field>
                <Field label="Chave Pix" htmlFor="pixKey">
                  <Input id="pixKey" required minLength={3} value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
                </Field>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-faint p-3">
                    <div className="min-w-0 leading-tight">
                      <p className="text-xs text-muted-foreground">Chave Pix cadastrada</p>
                      <p className="truncate text-[13px] font-semibold">{account.data ? `${account.data.pixKeyType.toUpperCase()} ${account.data.pixKeyMasked}` : '…'}</p>
                    </div>
                    <Link to="/settings?tab=wallet" className="text-xs font-semibold text-primary hover:underline">
                      Trocar
                    </Link>
                  </div>
                )}
                <Button type="submit" className="w-full" loading={withdraw.isPending} disabled={!canWithdraw}>
                  Solicitar saque
                </Button>
                <p className="text-xs text-muted-foreground">O Hub+ faz o Pix na chave cadastrada e marca o saque como pago. Você acompanha o status aqui.</p>
              </form>
            </CardContent>
          </Card>

          <Card aria-labelledby="withdrawals-title">
            <CardHeader>
              <CardTitle id="withdrawals-title">Saques</CardTitle>
            </CardHeader>
            {data.withdrawals.length === 0 ? (
              <p className="p-[18px] text-[13px] text-muted-foreground">Nenhum saque solicitado.</p>
            ) : (
              <ul>
                {data.withdrawals.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 border-t border-border px-[18px] py-3 first:border-t-0">
                    <div className="min-w-0 leading-tight">
                      <p className="text-[13px] font-semibold tabular">{formatCurrency(item.amountInCents)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(item.requestedAt)} · {item.pixKey}
                      </p>
                      {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                    </div>
                    <Badge variant={withdrawalStatus[item.status].variant}>{withdrawalStatus[item.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardContent className="flex gap-3">
              <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-sand-soft text-warning">
                <HelpCircle className="size-4" />
              </span>
              <div className="text-[13px]">
                <b className="font-semibold">Por que existe o saldo pendente?</b>
                <p className="mt-1 text-muted-foreground">O aluno tem {data.holdDays} dias de garantia. Depois disso, o valor da venda passa para disponível e pode ser sacado.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
