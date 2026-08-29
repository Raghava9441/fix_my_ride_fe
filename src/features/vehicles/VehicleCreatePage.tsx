import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function VehicleCreatePage() {
  return (
    <PlaceholderPage
      title="Add vehicle"
      description="Registration, specification, and initial odometer reading."
      endpoints={['POST /api/v1/vehicles', 'GET /api/v1/vehicles/by-registration', 'GET /api/v1/vehicles/by-vin']}
      permissions={[PERMISSIONS.vehicle.create]}
    />
  )
}
