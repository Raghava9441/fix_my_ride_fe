import type { ReactNode } from 'react'
import clsx from 'clsx'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Primary/secondary actions, right-aligned on wide viewports. */
  actions?: ReactNode
  /** Status pills or counts, shown next to the title. */
  meta?: ReactNode
  className?: string
}

/**
 * The standard top of every screen.
 *
 * One component so title size, action placement, and the gap below the
 * header are identical everywhere — the thing users notice as "the app feels
 * consistent" is almost entirely this kind of repetition, and it only stays
 * consistent if there's one place to change it.
 */
export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <header className={clsx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl leading-tight">{title}</h1>
          {meta}
        </div>
        {description && <p className="max-w-2xl text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
