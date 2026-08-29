import type { ComponentType, ReactNode, SVGProps } from 'react'
import clsx from 'clsx'

interface EmptyStateProps {
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  description?: ReactNode
  action?: ReactNode
  /** `sm` sits inside a card; `md` owns the page. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * The state a list is in most of the time on a new account.
 *
 * Worth a real component rather than an ad-hoc `<p>Nothing here</p>`: an
 * empty list is the first thing most users see on most screens, and it is
 * the only chance to say what the screen is *for* and give them the action
 * that fills it.
 */
export function EmptyState({ icon: Icon, title, description, action, size = 'md', className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 text-center',
        size === 'md' ? 'px-6 py-14' : 'px-4 py-8',
        className,
      )}
    >
      {Icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-card bg-surface-sunken text-text-faint">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="flex max-w-sm flex-col gap-1">
        <p className={clsx('font-display font-semibold', size === 'md' ? 'text-base' : 'text-sm')}>{title}</p>
        {description && <div className="text-sm text-text-muted">{description}</div>}
      </div>
      {action}
    </div>
  )
}
