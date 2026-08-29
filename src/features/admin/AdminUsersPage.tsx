import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function AdminUsersPage() {
  return (
    <PlaceholderPage
      title="Users"
      description="Every account across every workspace, with suspend and reactivate."
      endpoints={[
        'GET  /api/v1/admin/users',
        'POST /api/v1/admin/users/:id/suspend',
        'POST /api/v1/admin/users/:id/activate',
      ]}
      permissions={[PERMISSIONS.system.admin]}
    />
  )
}
