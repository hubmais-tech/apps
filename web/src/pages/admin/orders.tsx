import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState, ErrorState, Loading, PageHeader } from '@/components/query-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, getErrorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

type Order = {
  id: string
  courseTitle: string
  buyerEmail: string
  amountInCents: number
  platformFeeInCents: number
  mentorAmountInCents: number
  status: 'pending' | 'paid' | 'refunded' | 'failed'
  createdAt: string
}

const status = {
  pending: { label: 'Pendente', variant: 'default' },
  paid: { label: 'Pago', variant: 'success' },
  refunded: { label: 'Reembolsado', variant: 'accent' },
  failed: { label: 'Falhou', variant: 'destructive' },
} as const

export function AdminOrdersPage() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => (await api.get<{ orders: Order[] }>('/admin/orders')).data.orders,
  })

  const refund = useMutation({
    mutationFn: (id: string) => api.post(`/admin/orders/${id}/refund`),
    onSuccess: () => {
      toast.success('Pedido reembolsado e acesso revogado.')
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  if (query.isLoading) return <Loading />
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos" description="Últimas compras de cursos e a divisão entre mentor e Hub+." />
      {query.data.length === 0 && <EmptyState>Nenhum pedido ainda.</EmptyState>}
      <div className="space-y-3">
        {query.data.map((order) => (
          <Card key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{order.courseTitle}</p>
              <p className="text-muted-foreground">
                {order.buyerEmail} · {formatDate(order.createdAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Total {formatCurrency(order.amountInCents)} · Mentor {formatCurrency(order.mentorAmountInCents)} · Hub+ {formatCurrency(order.platformFeeInCents)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={status[order.status].variant}>{status[order.status].label}</Badge>
              {order.status === 'paid' && (
                <Button size="sm" variant="outline" loading={refund.isPending} onClick={() => refund.mutate(order.id)}>
                  <Undo2 /> Reembolsar
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
