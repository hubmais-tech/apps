import type { ComponentProps } from 'react'

/** O lucide-react 1.x não traz ícones de marca. Mesmo traço (24x24, 1,8 px) dos demais ícones. */
export function Instagram(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".6" />
    </svg>
  )
}
