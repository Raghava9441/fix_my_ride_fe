import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, CardBody, CardHeader } from '@/components/ui'
import {
  ACCOUNT_ROLES,
  ACCOUNT_ROLE_GRANTS,
  ACCOUNT_ROLE_LABELS,
  RBAC_ROLES,
  RBAC_ROLE_GRANTS,
  RBAC_ROLE_LABELS,
  RBAC_ROLE_LEVELS,
} from '@/lib/access/roles'
import { to } from '@/lib/routing'
import { useAccess } from '@/lib/access'

/**
 * Both role vocabularies, side by side.
 *
 * They are shown separately rather than merged because they genuinely are
 * two systems: the coarse account role is what the API's `requireRole()`
 * checks and what the token carries, while the RBAC role hierarchy is what
 * the permission catalog hangs off and what no route enforces yet. Merging
 * them into one "roles" list would paper over exactly the distinction
 * someone comes to this screen to understand.
 */
export default function RolesPage() {
  const { session } = useAccess()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Roles"
        description="How role membership resolves into permissions in this client."
      />

      <Card>
        <CardHeader
          title="Account roles"
          description="The coarse vocabulary in the access token. This is what the API's role guards compare against."
        />
        <CardBody className="flex flex-col gap-2">
          {ACCOUNT_ROLES.map((role) => {
            const isYours = session?.roles.includes(role)
            return (
              <div
                key={role}
                className="flex flex-wrap items-center justify-between gap-2 rounded-input border border-border px-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{ACCOUNT_ROLE_LABELS[role]}</span>
                    {isYours && <Badge tone="accent">You</Badge>}
                  </div>
                  <code className="font-mono text-[10px] text-text-faint">{role}</code>
                </div>
                <span className="tabnum font-mono text-xs text-text-muted">
                  {ACCOUNT_ROLE_GRANTS[role].length} permissions
                </span>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="RBAC roles"
          description="The Role collection's hierarchy. Lower level means more authority."
        />
        <CardBody className="flex flex-col gap-2">
          {RBAC_ROLES.map((role) => (
            <Link
              key={role}
              to={to.roleDetail(role)}
              className="interactive flex flex-wrap items-center justify-between gap-2 rounded-input border border-border px-3 py-2 hover:border-border-strong hover:bg-surface-sunken"
            >
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{RBAC_ROLE_LABELS[role]}</span>
                  {session?.rbacRole === role && <Badge tone="accent">You</Badge>}
                </div>
                <code className="font-mono text-[10px] text-text-faint">{role}</code>
              </div>
              <div className="flex flex-none items-center gap-3">
                <Badge tone="neutral" dot={false}>
                  level {RBAC_ROLE_LEVELS[role]}
                </Badge>
                <span className="tabnum font-mono text-xs text-text-muted">
                  {RBAC_ROLE_GRANTS[role].length} permissions
                </span>
              </div>
            </Link>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="text-xs text-text-faint">
          These matrices live in <code className="font-mono">src/lib/access/roles.ts</code> and are a client-side
          approximation of intent. The API stores its own Role documents and seeds the same hierarchy, but exposes no
          endpoint that resolves a principal to a permission set — so nothing here has been round-tripped against the
          server. Editing a role has to go through <code className="font-mono">/api/v1/roles</code>, which is admin-only.
        </CardBody>
      </Card>
    </div>
  )
}
