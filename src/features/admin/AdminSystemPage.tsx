import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function AdminSystemPage() {
  return (
    <PlaceholderPage
      title="System health"
      description="Service health, queue depth, and maintenance actions."
      endpoints={['GET /api/v1/admin/system/health', 'GET /api/v1/admin/system/metrics', 'GET /api/v1/admin/system/logs']}
      permissions={[PERMISSIONS.system.admin]}
    />
  )
}
