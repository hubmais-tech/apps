import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-semibold', {
  variants: {
    variant: {
      default: 'border border-border bg-faint text-muted-foreground',
      primary: 'bg-primary-soft text-primary',
      accent: 'bg-sand-soft text-warning',
      orange: 'bg-orange-soft text-orange',
      success: 'bg-mint-soft text-success',
      destructive: 'bg-destructive/12 text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
