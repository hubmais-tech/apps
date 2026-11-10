import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, getErrorMessage, type Withdrawal } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

type AdminWithdrawal = Withdrawal & { ownerName: string }

export function AdminWithdrawalsPage() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => (await api.get<{ withdrawals: AdminWithdrawal[] }>('/admin/withdrawals')).data.withdrawals,
  })

  const process = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: 'pay' | 'reject'; note?: string }) => api.post(`/admin/withdrawals/${id}/${action}`, { note }),
    onSuccess: (_data, { action }) => {
      toast.success(action === 'pay' ? 'Saque marcado como pago.' : 'Saque recusado e valor devolvido ao saldo.')
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader title="Saques" description="Faça o Pix para a chave informada e depois marque o saque como pago." />
      {query.data.length === 0 && <EmptyState>Nenhum saque solicitado.</EmptyState>}
      <div className="space-y-3">
        {query.data.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">
                {item.ownerName} · {formatCurrency(item.amountInCents)}
              </p>
              <p className="text-muted-foreground">
                Pix ({item.pixKeyType}): <span className="select-all font-mono text-foreground">{item.pixKey}</span>
              </p>
              <p className="text-xs text-muted-foreground">Solicitado em {formatDate(item.requestedAt)}</p>
            </div>
            {item.status === 'requested' ? (
              <div className="flex gap-2">
                <Button size="sm" loading={process.isPending} onClick={() => process.mutate({ id: item.id, action: 'pay' })}>
                  <Check /> Marcar como pago
                </Button>
                <Button size="sm" variant="outline" loading={process.isPending} onClick={() => process.mutate({ id: item.id, action: 'reject' })}>
                  <X /> Recusar
                </Button>
              </div>
            ) : (
              <Badge variant={item.status === 'paid' ? 'success' : 'destructive'}>{item.status === 'paid' ? 'Pago' : 'Recusado'}</Badge>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
