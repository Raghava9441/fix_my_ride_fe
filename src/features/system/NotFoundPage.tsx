import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'

/**
 * Rendered inside the shell by the `*` route, so the nav stays available —
 * a 404 that strands you on a bare page makes the mistyped URL feel like a
 * crash. Echoing the path back is the fastest way for someone to spot their
 * own typo.
 */
export default function NotFoundPage() {
  const location = useLocation()

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
      <span className="text-xs font-bold uppercase tracking-wide text-text-faint">404</span>
      <h1 className="text-xl">Page not found</h1>
      <p className="text-sm text-text-muted">
        Nothing is routed at <code className="font-mono text-xs">{location.pathname}</code>.
      </p>
      <Button asChild variant="secondary" className="mt-2">
        <Link to={ROUTE_PATHS.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  )
}
