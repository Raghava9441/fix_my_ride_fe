import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, CardBody, CardHeader } from '@/components/ui'
import { useAccess } from '@/lib/access'
import { describePermission } from '@/lib/access/permissions'
import { RBAC_ROLE_GRANTS, RBAC_ROLE_LABELS, RBAC_ROLE_LEVELS, isRbacRole } from '@/lib/access/roles'

/**
 * A single RBAC role and the permissions it grants.
 *
 * Reads the local grant matrix, so a role id that isn't one of the seeded
 * system roles renders an honest empty state rather than a spinner that
 * never resolves — custom roles live only in the database today.
 */
export default function RoleDetailPage() {
  const { roleId = '' } = useParams()
  const { capabilities } = useAccess()

  if (!isRbacRole(roleId)) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Role" description={`No system role named "${roleId}".`} />
        <Card>
          <CardBody className="text-sm text-text-muted">
            Custom and tenant-scoped roles are stored server-side and would be loaded from
            <code className="mx-1 font-mono text-xs">GET /api/v1/roles/:id</code>. Only the seeded system roles are
            described in this client.
          </CardBody>
        </Card>
      </div>
    )
  }

  const permissions = RBAC_ROLE_GRANTS[roleId]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={RBAC_ROLE_LABELS[roleId]}
        description="Permissions this role grants, per the seeded system hierarchy."
        meta={<Badge tone="neutral" dot={false}>level {RBAC_ROLE_LEVELS[roleId]}</Badge>}
      />

      <Card>
        <CardHeader title="Granted permissions" description={`${permissions.length} in total.`} />
        <CardBody className="flex flex-col gap-1.5">
          {permissions.map((permission) => (
            <div
              key={permission}
              className="flex items-center justify-between gap-3 rounded-input px-2 py-1.5 odd:bg-surface-sunken"
            >
              <div className="flex min-w-0 flex-col">
                <code className="truncate font-mono text-xs">{permission}</code>
                <span className="text-[10px] text-text-faint">{describePermission(permission)}</span>
              </div>
              {(capabilities.isSuperuser || capabilities.permissions.has(permission)) && (
                <Badge tone="success">held</Badge>
              )}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
