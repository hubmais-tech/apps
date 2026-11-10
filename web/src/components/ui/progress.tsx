import { cn } from '@/lib/utils'

export function Progress({ value, className, tone = 'orange' }: { value: number; className?: string; tone?: 'orange' | 'primary' }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full border border-border bg-faint', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', tone === 'orange' ? 'bg-orange' : 'bg-primary')} style={{ width: `${clamped}%` }} />
    </div>
  )
}
