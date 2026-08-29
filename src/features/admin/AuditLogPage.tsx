import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function AuditLogPage() {
  return (
    <PlaceholderPage
      title="Audit log"
      description="Who changed what, filterable by actor and by affected entity."
      endpoints={[
        'GET /api/v1/audit-logs',
        'GET /api/v1/audit-logs/summary',
        'GET /api/v1/audit-logs/actor/:actorId',
        'GET /api/v1/audit-logs/entity/:entityType/:entityId',
      ]}
      permissions={[PERMISSIONS.system.admin]}
    />
  )
}
