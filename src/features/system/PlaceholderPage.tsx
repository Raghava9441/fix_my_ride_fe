import type { ReactNode } from 'react'
import { CompassIcon } from '@/components/icons'
import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAccess } from '@/lib/access'
import { useCurrentRoute } from '@/lib/routing'
import { PERMISSION_SCOPES, type PermissionKey } from '@/lib/access/permissions'

/**
 * The screen for a route that is fully wired — registered, guarded, in the
 * nav, in the breadcrumbs, in the command palette — but whose UI isn't built.
 *
 * It exists so the routing and permission work can be reviewed end-to-end
 * before a single table is written, and so the manifest stays honest: each
 * one names the API endpoints it will bind to and the permissions that gate
 * it. Replacing it is a one-line change to the registry's `component`.
 *
 * It also doubles as a live check on the access layer — the "who can see
 * this" panel reads the *same* capability set the guard used to let you in,
 * so if the two ever disagreed it would show here.
 */
export interface PlaceholderPageProps {
  title: string
  description: string
  /** `METHOD /path` strings from the API, most important first. */
  endpoints: string[]
  /** Permission keys that gate this screen, for the access panel. */
  permissions?: PermissionKey[]
  /** Anything worth calling out — a known API gap, an ordering dependency. */
  notes?: ReactNode
}

export function PlaceholderPage({ title, description, endpoints, permissions, notes }: PlaceholderPageProps) {
  const route = useCurrentRoute()
  const { capabilities } = useAccess()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={title}
        description={description}
        meta={<Badge tone="info">Routed · UI pending</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="API surface"
            description="Endpoints this screen will bind to."
          />
          <CardBody className="flex flex-col gap-1.5">
            {endpoints.map((endpoint) => (
              <code key={endpoint} className="font-mono text-xs text-text-muted">
                {endpoint}
              </code>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Access" description="Evaluated against your current session." />
          <CardBody className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">Route</span>
              <code className="font-mono text-xs text-text-muted">{route?.id ?? '—'}</code>
            </div>

            {permissions && permissions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">
                  Required permissions
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {permissions.map((permission) => (
                    <Badge
                      key={permission}
                      tone={
                        capabilities.isSuperuser || capabilities.permissions.has(permission)
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {permission} · {PERMISSION_SCOPES[permission]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-text-faint">
              Permissions are {capabilities.source === 'server' ? 'issued by the API' : 'derived from your account role'}
              {capabilities.source === 'derived' && ' — the API does not yet issue a permissions claim'}.
            </p>
          </CardBody>
        </Card>
      </div>

      {notes && (
        <Card>
          <CardBody className="text-sm text-text-muted">{notes}</CardBody>
        </Card>
      )}

      <Card>
        <EmptyState
          icon={CompassIcon}
          title="Nothing to show yet"
          description="This screen's data layer hasn't been built. Navigation, guards, breadcrumbs, and search already work."
        />
      </Card>
    </div>
  )
}
