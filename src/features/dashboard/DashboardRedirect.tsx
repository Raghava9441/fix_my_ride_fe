import { Navigate } from 'react-router-dom'
import { ROUTE_PATHS } from '@/lib/routing'

/**
 * The index route at `/`.
 *
 * A redirect rather than rendering the dashboard at two URLs: one canonical
 * address per screen keeps breadcrumbs, active-nav matching, and analytics
 * from having to special-case the alias.
 *
 * This is where a per-role landing page would go if roles diverged enough to
 * warrant it — a technician onto the service queue, an owner onto their
 * vehicles. Everyone gets a dashboard today, so it stays a plain redirect
 * rather than machinery with one branch.
 */
export default function DashboardRedirect() {
  return <Navigate to={ROUTE_PATHS.dashboard} replace />
}
