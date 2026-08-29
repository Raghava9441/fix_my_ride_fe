import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Flush against the page — no border or shadow. For nested grouping. */
  bare?: boolean
}

export function Card({ className, bare, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-card bg-surface-raised',
        !bare && 'border border-border shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  )
}

// `title` is widened from the DOM attribute's `string` to ReactNode, so the
// native one has to be omitted rather than merged.
interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function CardHeader({ className, title, description, actions, children, ...props }: CardHeaderProps) {
  if (children) {
    return (
      <div
        className={clsx('flex items-baseline justify-between gap-3 border-b border-border px-4 py-3', className)}
        {...props}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={clsx('flex items-start justify-between gap-3 border-b border-border px-4 py-3', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <h2 className="text-[15px] leading-tight">{title}</h2>}
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('flex items-center justify-end gap-2 border-t border-border px-4 py-3', className)}
      {...props}
    />
  )
}
