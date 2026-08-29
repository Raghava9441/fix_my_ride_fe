import { Link } from 'react-router-dom'
import { Badge, Card, CardBody } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'

/**
 * Signed-out counterpart to `features/system/PlaceholderPage` — same purpose
 * (the route is real, the form isn't built), but sized for the narrow
 * centred `AuthLayout` rather than the app shell.
 */
export function AuthPlaceholder({
  title,
  description,
  endpoints,
}: {
  title: string
  description: string
  endpoints: string[]
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardBody className="flex flex-col gap-4 p-7">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl">{title}</h1>
            <Badge tone="info">Routed</Badge>
          </div>
          <p className="text-sm text-text-muted">{description}</p>
        </div>

        <div className="flex flex-col gap-1 rounded-input bg-surface-sunken p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">API surface</span>
          {endpoints.map((endpoint) => (
            <code key={endpoint} className="font-mono text-xs text-text-muted">
              {endpoint}
            </code>
          ))}
        </div>

        <Link to={ROUTE_PATHS.login} className="interactive text-xs font-semibold text-accent">
          Back to sign in
        </Link>
      </CardBody>
    </Card>
  )
}
