import { Link, Outlet } from 'react-router-dom'
import { WrenchMark } from '@/components/icons'
import { AuthBackdrop } from './AuthBackdrop'
import { ROUTE_PATHS, useDocumentTitle } from '@/lib/routing'

/**
 * The frame for every signed-out screen: sign-in, registration, password
 * reset, email verification, invitation acceptance, and onboarding.
 *
 * Separate from `AppShell` rather than a variant of it, because these
 * screens have no navigation, no session, and no breadcrumbs — sharing a
 * shell would mean branching on `session ? … : …` in half of it.
 */
export function AuthLayout() {
  useDocumentTitle()

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-surface-sunken">
      <AuthBackdrop />
      <header className="flex items-center p-5">
        <Link to={ROUTE_PATHS.login} className="interactive flex items-center gap-2 rounded-input px-1 py-1">
          <span className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius-card)/1.6)] bg-accent text-accent-contrast">
            <WrenchMark className="h-4 w-4" />
          </span>
          <span className="font-display text-[15px]" style={{ fontWeight: 'var(--w-display)' }}>
            Fix My Ride
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center sm:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
