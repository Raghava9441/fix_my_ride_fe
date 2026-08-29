import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAccess } from '../access/AccessProvider'
import type { AccessRule } from '../access/policy'
import { useAuthStore } from '../auth/store'
import { ROUTE_PATHS, to } from './paths'
import { AccessDeniedView } from './AccessDeniedView'
import { RouteFallback } from './RouteFallback'

/**
 * The single gate every route passes through.
 *
 * Three outcomes, and the difference between them is the whole reason
 * `evaluate()` returns a reason instead of a boolean:
 *
 *   - **Session not resolved yet** — render a skeleton and wait. Redirecting
 *     here is the classic bug: on a hard refresh the token refresh hasn't
 *     finished, so a naive guard bounces an authenticated user to /login and
 *     loses their destination.
 *   - **`unauthenticated`** — redirect to login carrying `?next=`, so signing
 *     in resumes where they were rather than dumping them on the dashboard.
 *   - **Anything else** — render 403 *in place*, keeping the URL. A redirect
 *     would make the address unshareable and hide which screen was refused,
 *     which matters when someone is asking an admin for access to it.
 */
export function RouteGuard({ rule, children }: { rule: AccessRule; children: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const { decide } = useAccess()
  const location = useLocation()

  // A public route needs no session, so don't make anonymous visitors wait
  // on a token refresh that will fail anyway.
  const decision = decide(rule)
  const needsSession = !decision.allowed && decision.reason === 'unauthenticated'

  if ((status === 'idle' || status === 'loading') && needsSession) {
    return <RouteFallback label="Restoring your session" />
  }

  if (decision.allowed) return <>{children}</>

  if (decision.reason === 'unauthenticated') {
    return <Navigate to={to.loginWithReturn(location.pathname + location.search)} replace />
  }

  if (decision.reason === 'already-authenticated') {
    // Honour the `?next=` the unauthenticated redirect wrote. Without this,
    // someone who lands on /login already signed in — or who signs in in
    // another tab — is dropped on the dashboard having lost the deep link
    // that sent them here. Same-origin paths only; an arbitrary `next`
    // would make this an open redirect.
    const requested = new URLSearchParams(location.search).get('next')
    const target =
      requested?.startsWith('/') && !requested.startsWith('//') ? requested : ROUTE_PATHS.dashboard
    return <Navigate to={target} replace />
  }

  return <AccessDeniedView decision={decision} />
}
