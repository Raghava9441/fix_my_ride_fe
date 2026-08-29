import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function OwnersPage() {
  return (
    <PlaceholderPage
      title="Customers"
      description="Vehicle owners on record, their vehicles, and their service history."
      endpoints={[
        'GET /api/v1/owners',
        'GET /api/v1/owners/:id/vehicles',
        'GET /api/v1/owners/:id/service-history',
      ]}
      permissions={[PERMISSIONS.vehicle.readAll]}
    />
  )
}
