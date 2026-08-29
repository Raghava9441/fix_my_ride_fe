import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function ServiceRecordsPage() {
  return (
    <PlaceholderPage
      title="Service records"
      description="Every job logged against a vehicle: parts, labour, status, and the invoice it generated."
      endpoints={[
        'GET   /api/v1/service-records',
        'POST  /api/v1/service-records',
        'PATCH /api/v1/service-records/:id/status',
        'POST  /api/v1/service-records/:id/invoice/generate',
      ]}
      permissions={[PERMISSIONS.serviceRecord.read, PERMISSIONS.serviceRecord.readAll]}
    />
  )
}
