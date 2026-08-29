import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { ChevronLeftIcon } from '@/components/icons'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'
import { preloadRoute, useNavigation, type NavItem } from '@/lib/routing'

/**
 * The primary navigation rail.
 *
 * Every item here came from a route that declared `nav`, filtered by the
 * same access rule its guard evaluates — so what a user sees is exactly
 * what they can open. See lib/routing/navigation.ts.
 *
 * Hovering or focusing an item preloads that route's chunk. By the time a
 * click lands the code is usually already parsed, which is what lets the app
 * ship fully code-split without navigation feeling like it stalls.
 */

function NavItemLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const warm = () => preloadRoute(item.id)

  return (
    <NavLink
      to={item.path}
      onMouseEnter={warm}
      onFocus={warm}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          'interactive group relative flex items-center gap-2.5 rounded-input px-2.5 py-2 text-sm font-semibold',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-accent-bg text-text'
            : 'text-text-muted hover:bg-surface-sunken hover:text-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active marker as a bar rather than only a tint: at high contrast
              or in a colour-vision mode, a background wash alone is weak. */}
          <span
            aria-hidden
            className={clsx(
              'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <item.icon className="h-4 w-4 flex-none" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  )
}

export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const sections = useNavigation()
  const { preferences, setPreference } = usePreferences()
  const collapsed = preferences.navCollapsed

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-4">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {section.label && !collapsed && (
              <div className="px-2.5 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-text-faint">
                {section.label}
              </div>
            )}
            {/* Collapsed rail keeps the grouping as a rule instead of a heading. */}
            {section.label && collapsed && <div className="mx-auto my-1 h-px w-6 bg-border" aria-hidden />}

            {section.items.map((item) => (
              <NavItemLink key={item.id} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setPreference('navCollapsed', !collapsed)}
        className={clsx(
          'interactive hidden items-center gap-2 rounded-input px-2.5 py-2 text-xs font-semibold text-text-faint hover:bg-surface-sunken hover:text-text md:flex',
          collapsed && 'justify-center px-0',
        )}
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
      >
        <ChevronLeftIcon className={clsx('h-4 w-4 flex-none transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && <span>Collapse</span>}
      </button>
    </div>
  )
}

/** The same items laid out horizontally, for the `topbar` nav preference. */
export function TopNav() {
  const sections = useNavigation()
  const items = sections.flatMap((s) => s.items)

  return (
    <nav aria-label="Primary" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
      {items.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          onMouseEnter={() => preloadRoute(item.id)}
          onFocus={() => preloadRoute(item.id)}
          className={({ isActive }) =>
            clsx(
              'interactive flex flex-none items-center gap-2 rounded-input px-2.5 py-1.5 text-sm font-semibold',
              isActive ? 'bg-accent-bg text-text' : 'text-text-muted hover:bg-surface-sunken hover:text-text',
            )
          }
        >
          <item.icon className="h-4 w-4 flex-none" />
          <span className="hidden lg:inline">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
