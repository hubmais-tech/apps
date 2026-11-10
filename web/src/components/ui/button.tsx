import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-[13px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border-border bg-surface text-foreground hover:bg-faint',
        outline: 'border-border bg-surface text-foreground hover:bg-faint',
        soft: 'bg-primary-soft text-primary hover:brightness-95',
        ghost: 'text-foreground hover:bg-muted',
        accent: 'bg-orange-soft text-orange hover:brightness-95',
        destructive: 'bg-destructive text-white hover:brightness-110',
      },
      size: {
        default: 'h-[38px] px-3.5',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-[38px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean }

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" />}
          {children}
        </>
      )}
    </Comp>
  )
}

export { buttonVariants }
