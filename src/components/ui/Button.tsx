import { cloneElement, forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactElement } from 'react'
import clsx from 'clsx'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /**
   * Render the single child element with the button's classes instead of a
   * `<button>`. For links that look like buttons — `<Button asChild><Link
   * to="…">` — which keeps them real anchors: middle-click, open in new tab,
   * and "copy link address" all keep working, none of which survive an
   * `onClick={() => navigate(…)}` on a button.
   */
  asChild?: boolean
  /** Shows a spinner and blocks interaction without changing the width. */
  loading?: boolean
  /** Square, for a bare icon. Supply an `aria-label`. */
  iconOnly?: boolean
}

const base =
  'interactive relative inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:brightness-[1.08] active:brightness-95',
  secondary: 'bg-surface-raised border border-border text-text hover:border-border-strong hover:bg-surface-sunken',
  subtle: 'bg-surface-sunken text-text hover:bg-border',
  ghost: 'text-text-muted hover:text-text hover:bg-surface-sunken',
  danger: 'bg-critical text-white hover:brightness-110 active:brightness-95',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
}

const iconSizes: Record<ButtonSize, string> = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', asChild, loading, iconOnly, children, disabled, ...props },
  ref,
) {
  const classes = clsx(base, variants[variant], iconOnly ? iconSizes[size] : sizes[size], className)

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>
    return cloneElement(child, { className: clsx(classes, child.props.className) })
  }

  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className="h-4 w-4" />
        </span>
      )}
      {/* Kept in the flow but invisible while loading, so the button doesn't
          resize mid-submit and shift everything next to it. */}
      <span className={clsx('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
    </button>
  )
})
