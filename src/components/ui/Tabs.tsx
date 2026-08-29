import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

export interface TabDefinition {
  to: string
  label: string
  /** Only matches when the URL is exactly `to`. Needed for a tab at the parent path. */
  end?: boolean
}

/**
 * URL-backed tabs.
 *
 * Tabs here are real routes, not local state, because a tab is a place: it
 * should be linkable, survive a refresh, and go back with the back button.
 * The registry declares them as child routes and this just renders the
 * matching set — which also means an unauthorised tab simply isn't in the
 * list, via the same access rule that guards it.
 */
export function Tabs({ tabs, className }: { tabs: TabDefinition[]; className?: string }) {
  if (tabs.length === 0) return null

  return (
    <nav className={clsx('flex gap-1 overflow-x-auto border-b border-border', className)}>
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            clsx(
              'interactive -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold',
              isActive
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:border-border-strong hover:text-text',
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
