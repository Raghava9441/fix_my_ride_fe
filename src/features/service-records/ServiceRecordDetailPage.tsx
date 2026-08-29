import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function ServiceRecordDetailPage() {
  const { serviceRecordId } = useParams()

  return (
    <PlaceholderPage
      title="Service record"
      description={`Job ${serviceRecordId ?? ''} — parts, labour lines, attached documents, and customer feedback.`}
      endpoints={[
        'GET  /api/v1/service-records/:id',
        'PUT  /api/v1/service-records/:id',
        'GET  /api/v1/service-records/:id/parts',
        'GET  /api/v1/service-records/:id/labor',
        'POST /api/v1/service-records/:id/feedback',
      ]}
      permissions={[PERMISSIONS.serviceRecord.read, PERMISSIONS.serviceRecord.update]}
    />
  )
}
