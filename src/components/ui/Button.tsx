import { forwardRef, type ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'interactive inline-flex items-center justify-center gap-2 rounded-pill text-sm font-semibold px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-contrast hover:brightness-[1.06]',
  secondary: 'bg-surface-raised border border-border text-text hover:border-border-strong',
  ghost: 'text-text-muted hover:text-text hover:bg-surface-sunken',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', ...props },
  ref,
) {
  return <button ref={ref} className={clsx(base, variants[variant], className)} {...props} />
})
