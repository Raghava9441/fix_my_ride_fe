import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function AdminTenantDetailPage() {
  const { tenantId } = useParams()

  return (
    <PlaceholderPage
      title="Tenant"
      description={`Workspace ${tenantId ?? ''} — status, plan, members, and activity.`}
      endpoints={['GET /api/v1/admin/tenants/:id', 'PATCH /api/v1/admin/tenants/:id/status']}
      permissions={[PERMISSIONS.system.admin]}
    />
  )
}
