import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, CardBody, CardHeader } from '@/components/ui'
import { useAccess } from '@/lib/access'
import {
  ALL_PERMISSIONS,
  PERMISSION_SCOPES,
  describePermission,
  type PermissionKey,
  type PermissionScope,
} from '@/lib/access/permissions'

/**
 * The permission catalog, and which of it you actually hold.
 *
 * Built entirely from the local catalog rather than `GET /permissions`,
 * which is deliberate: the client's catalog is what every guard, nav filter,
 * and `<Can>` in this app evaluates against, so this screen shows the model
 * that is really in force. It is also the fastest way to see whether the
 * capability derivation is doing what you expect for a given account —
 * sign in as a technician and the shape of this page is the answer.
 *
 * The API's `/permissions` endpoint becomes the source once it issues a
 * resolved set per principal; `deriveCapabilities()` is the one place that
 * changes.
 */

const SCOPE_TONE: Record<PermissionScope, 'neutral' | 'info' | 'warning' | 'critical'> = {
  own: 'neutral',
  center: 'info',
  tenant: 'warning',
  global: 'critical',
}

const SCOPE_DESCRIPTION: Record<PermissionScope, string> = {
  own: 'Only records the account owns.',
  center: 'Everything in the account’s service center.',
  tenant: 'Everything in the workspace.',
  global: 'Across every workspace on the platform.',
}

export default function PermissionsPage() {
  const { capabilities } = useAccess()

  const byResource = useMemo(() => {
    const groups = new Map<string, PermissionKey[]>()
    for (const permission of ALL_PERMISSIONS) {
      const resource = permission.split(':')[0]
      groups.set(resource, [...(groups.get(resource) ?? []), permission])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [])

  const heldCount = capabilities.isSuperuser
    ? ALL_PERMISSIONS.length
    : ALL_PERMISSIONS.filter((p) => capabilities.permissions.has(p)).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Permissions"
        description="The full catalog, and the effective set resolved for your session."
        meta={
          <Badge tone={capabilities.source === 'server' ? 'success' : 'warning'}>
            {capabilities.source === 'server' ? 'Issued by API' : 'Derived from role'}
          </Badge>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="tabnum font-mono text-2xl font-semibold">
              {heldCount}
              <span className="text-base text-text-faint"> / {ALL_PERMISSIONS.length}</span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">permissions held in this session</p>
          </div>
          <p className="max-w-md text-xs text-text-faint">
            The API issues no permissions claim today, so this set is inferred from your account role. Treat it as
            navigation and UX, not as enforcement — the server admits or refuses each request on its own.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {byResource.map(([resource, permissions]) => (
          <Card key={resource}>
            <CardHeader title={resource.replace(/_/g, ' ')} />
            <CardBody className="flex flex-col gap-1.5">
              {permissions.map((permission) => {
                const held = capabilities.isSuperuser || capabilities.permissions.has(permission)
                const scope = PERMISSION_SCOPES[permission]

                return (
                  <div
                    key={permission}
                    className="flex items-center justify-between gap-3 rounded-input px-2 py-1.5 odd:bg-surface-sunken"
                  >
                    <div className="flex min-w-0 flex-col">
                      <code className="truncate font-mono text-xs text-text">{permission}</code>
                      <span className="text-[10px] text-text-faint">{describePermission(permission)}</span>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <Badge tone={SCOPE_TONE[scope]} dot={false}>
                        <span title={SCOPE_DESCRIPTION[scope]}>{scope}</span>
                      </Badge>
                      <Badge tone={held ? 'success' : 'neutral'}>{held ? 'held' : 'not held'}</Badge>
                    </div>
                  </div>
                )
              })}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
