import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function ServiceCentersPage() {
  return (
    <PlaceholderPage
      title="Service centers"
      description="Every workshop in the workspace, with its staff, services, and verification state."
      endpoints={[
        'GET /api/v1/service-centers',
        'GET /api/v1/service-centers/nearby',
        'GET /api/v1/service-centers/:id/stats',
      ]}
      permissions={[PERMISSIONS.serviceCenter.read]}
    />
  )
}
