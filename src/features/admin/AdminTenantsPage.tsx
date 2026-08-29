import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function AdminTenantsPage() {
  return (
    <PlaceholderPage
      title="Tenants"
      description="Every workspace on the platform, including the ones waiting on approval."
      endpoints={[
        'GET  /api/v1/admin/tenants',
        'POST /api/v1/admin/tenants/:id/approve',
        'POST /api/v1/admin/tenants/:id/reject',
      ]}
      permissions={[PERMISSIONS.system.admin]}
    />
  )
}
