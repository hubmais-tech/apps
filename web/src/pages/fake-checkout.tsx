import { useMutation } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { api, getErrorMessage } from '@/lib/api'

/** Somente desenvolvimento (PAYMENT_GATEWAY=fake): simula a página de pagamento do Stripe. */
export function FakeCheckoutPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const pay = useMutation({
    mutationFn: () => api.post(`/dev/orders/${orderId}/pay`),
    onSuccess: () => {
      toast.success('Pagamento simulado com sucesso!')
      navigate('/my-learning')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  return (
    <Card className="mx-auto mt-6 max-w-md space-y-4 p-6 text-center">
      <FlaskConical className="mx-auto size-8 text-warning" />
      <h1 className="text-lg font-bold">Checkout de teste</h1>
      <p className="text-sm text-muted-foreground">
        O gateway está em modo <strong>fake</strong>. Nenhuma cobrança real será feita. Em produção, esta etapa é a página do Stripe.
      </p>
      <Button className="w-full" loading={pay.isPending} onClick={() => pay.mutate()}>
        Simular pagamento aprovado
      </Button>
    </Card>
  )
}
