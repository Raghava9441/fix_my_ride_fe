import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronLeftIcon } from '@/components/icons'

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Primary/secondary actions, right-aligned on wide viewports. */
  actions?: ReactNode
  /** Status pills or counts, shown next to the title. */
  meta?: ReactNode
  /**
   * Renders a back link above the title. A real `<Link>` rather than
   * `history.back()`: the browser already has a back button, and this needs
   * to work when someone arrived by pasting the URL, where there is no
   * history entry to go back to.
   */
  backTo?: string
  backLabel?: string
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
export function PageHeader({
  title,
  description,
  actions,
  meta,
  backTo,
  backLabel = 'Back',
  className,
}: PageHeaderProps) {
  return (
    <header className={clsx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {backTo && (
          <Link
            to={backTo}
            className="interactive -ml-1 mb-0.5 inline-flex w-fit items-center gap-1 rounded-input px-1 py-0.5 text-xs font-semibold text-text-muted hover:bg-surface-sunken hover:text-text"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        )}
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
