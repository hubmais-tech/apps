import logo from '@/assets/logo.jpg'
import { cn } from '@/lib/utils'

/** Usa o JPG do Instagram (150x150) enquanto o arquivo em alta resolução não chega (D5). */
export function Logo({ className, withName = true }: { className?: string; withName?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src={logo} alt="Hub+" width={32} height={32} className="size-8 rounded-lg" />
      {withName && <span className="font-heading text-[17px] font-bold">Hub+</span>}
    </span>
  )
}
