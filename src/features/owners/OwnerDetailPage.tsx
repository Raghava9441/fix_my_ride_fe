import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function OwnerDetailPage() {
  const { ownerId } = useParams()

  return (
    <PlaceholderPage
      title="Customer"
      description={`Owner ${ownerId ?? ''} — vehicles, spend, notification preferences, and history.`}
      endpoints={[
        'GET /api/v1/owners/:id',
        'GET /api/v1/owners/:id/vehicles',
        'GET /api/v1/owners/:id/expenses',
        'GET /api/v1/owners/:id/preferences',
      ]}
      permissions={[PERMISSIONS.vehicle.readAll]}
    />
  )
}
