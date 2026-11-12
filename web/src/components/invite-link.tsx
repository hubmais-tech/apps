import { Check, Copy, Link2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/** Mostra o link de convite para copiar. Ainda não há envio de e-mail (A11). */
export function InviteLink({ url, title = 'Link de convite' }: { url: string; title?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.')
    }
  }

  return (
    <Card className="border-primary">
      <CardContent className="space-y-3 pt-[18px]">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <Link2 className="size-4 text-primary" /> {title}
        </div>
        <p className="text-[13px] text-muted-foreground">Envie este link para a pessoa. Ele vale por 7 dias e só pode ser usado uma vez. Ainda não enviamos e-mails automaticamente (A11).</p>
        <div className="flex gap-2">
          <Input aria-label={title} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? <Check /> : <Copy />} {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
