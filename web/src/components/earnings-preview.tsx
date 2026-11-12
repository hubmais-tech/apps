import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '@/lib/api'
import { cn, formatCurrency } from '@/lib/utils'

type Preview = {
  priceInCents: number
  minPriceInCents: number
  platformFeePercent: number
  platformFeeInCents: number
  gatewayFeePercent: number
  gatewayFeeFixedInCents: number
  gatewayFeeInCents: number
  mentorAmountInCents: number
  holdDays: number
}

const percent = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

/** Espera o mentor parar de digitar antes de consultar a API. */
function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/**
 * Mostra quanto do preço fica com o mentor (D22). O cálculo vem da API, que usa a mesma função
 * que grava o pedido, então o valor exibido é o que cai na carteira.
 */
export function EarningsPreview({ priceInCents, className }: { priceInCents: number; className?: string }) {
  const valid = Number.isFinite(priceInCents) && priceInCents >= 500
  const price = useDebounced(valid ? priceInCents : null)

  const query = useQuery({
    queryKey: ['pricing-preview', price],
    enabled: price !== null,
    staleTime: 60_000,
    queryFn: async () => (await api.get<Preview>('/pricing/preview', { params: { priceInCents: price } })).data,
  })

  const data = valid && price === priceInCents ? query.data : undefined

  return (
    <section aria-label="Quanto você recebe" className={cn('rounded-xl border border-border bg-faint', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <h3 className="text-[13px] font-bold">Quanto você recebe</h3>
        <span className="text-[11px] text-muted-foreground">por venda</span>
      </header>

      {!valid ? (
        <p className="px-3.5 py-3 text-[13px] text-muted-foreground">Informe um preço a partir de R$ 5,00 para ver o cálculo.</p>
      ) : query.isError && price === priceInCents ? (
        <p className="px-3.5 py-3 text-[13px] text-muted-foreground">Não foi possível calcular agora. Confira o preço e tente de novo.</p>
      ) : !data ? (
        <div className="space-y-2 px-3.5 py-3" role="status" aria-label="Calculando">
          <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-5 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <>
          <dl className="space-y-2 px-3.5 py-3 text-[13px]">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">O aluno paga</dt>
              <dd className="font-semibold tabular">{formatCurrency(data.priceInCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Retenção do Hub+ ({percent(data.platformFeePercent)})</dt>
              <dd className="font-semibold tabular">− {formatCurrency(data.platformFeeInCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">
                Taxa do meio de pagamento <span className="text-xs">({percent(data.gatewayFeePercent)} + {formatCurrency(data.gatewayFeeFixedInCents)}, estimada)</span>
              </dt>
              <dd className="font-semibold tabular">− {formatCurrency(data.gatewayFeeInCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2.5">
              <dt className="font-semibold">Você recebe</dt>
              <dd className="font-heading text-lg font-bold text-success tabular">{formatCurrency(data.mentorAmountInCents)}</dd>
            </div>
          </dl>
          <p className="flex gap-2 border-t border-border px-3.5 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              O valor fica pendente por {data.holdDays} dias (garantia do aluno) e depois pode ser sacado. A taxa do meio de pagamento é uma estimativa. Vendas já feitas mantêm o valor da época.
            </span>
          </p>
        </>
      )}
    </section>
  )
}
