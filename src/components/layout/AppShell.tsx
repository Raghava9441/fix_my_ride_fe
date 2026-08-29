import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { CloseIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { useFlag } from '@/lib/flags/FlagsProvider'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'
import { useDocumentTitle } from '@/lib/routing'
import { Breadcrumbs } from './Breadcrumbs'
import { CommandPalette } from './CommandPalette'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'

/**
 * The authenticated frame: top bar, primary navigation, breadcrumbs, and the
 * routed content.
 *
 * Layout follows the `nav` preference (rail vs. top bar) and the
 * `navCollapsed` state, both driven by CSS variables so switching either
 * doesn't remount anything below it. On narrow viewports the rail becomes an
 * overlay drawer regardless of preference — a 244px rail on a phone isn't a
 * layout choice, it's a bug.
 *
 * Content scrolls in its own region rather than the window, so the top bar
 * and rail stay put on a long table without any sticky-positioning
 * gymnastics.
 */
export function AppShell() {
  const { preferences } = usePreferences()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteEnabled = useFlag('commandPalette')

  const isRail = preferences.nav === 'sidebar'
  const railWidth = preferences.navCollapsed
    ? 'var(--layout-sidenav-collapsed-w)'
    : 'var(--layout-sidenav-w)'

  useDocumentTitle()

  // Navigating closes the drawer — leaving it open over new content hides
  // the thing the user just asked for.
  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (!paletteEnabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paletteEnabled])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <a href="#main-content" className="skip-link text-sm font-semibold">
        Skip to content
      </a>

      <TopBar
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
        showInlineNav={!isRail}
      />

      <div className="flex min-h-0 flex-1">
        {isRail && (
          <aside
            className="hidden flex-none border-r border-border bg-surface-raised md:block"
            style={{ width: railWidth, transition: 'width var(--duration-moderate) var(--ease-standard)' }}
          >
            <SideNav />
          </aside>
        )}

        {/* Rendered only while open, so it can't be tabbed into from behind
            the content and doesn't need an inert/focus-trap dance. */}
        {drawerOpen && (
          <>
            <div
              className="anim-fade-in fixed inset-0 bg-black/40 md:hidden"
              style={{ zIndex: 'var(--z-drawer-scrim)' }}
              onClick={() => setDrawerOpen(false)}
              role="presentation"
            />
            <aside
              className="anim-fade-in fixed inset-y-0 left-0 flex w-64 flex-col bg-surface-raised md:hidden"
              style={{ zIndex: 'var(--z-drawer)' }}
              aria-label="Navigation"
            >
              <div className="flex flex-none items-center justify-end p-2">
                <Button
                  variant="ghost"
                  iconOnly
                  size="sm"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                >
                  <CloseIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <SideNav onNavigate={() => setDrawerOpen(false)} />
              </div>
            </aside>
          </>
        )}

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-4 p-4 md:p-6">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
