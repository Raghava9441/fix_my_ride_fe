import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function StaffDetailPage() {
  const { staffId } = useParams()

  return (
    <PlaceholderPage
      title="Staff member"
      description={`Profile ${staffId ?? ''} — role, permission overrides, schedule, and completed jobs.`}
      endpoints={[
        'GET    /api/v1/staff/:id',
        'PUT    /api/v1/staff/:id',
        'POST   /api/v1/staff/:id/permissions',
        'DELETE /api/v1/staff/:id/permissions/:permissionId',
        'GET    /api/v1/staff/:id/services',
      ]}
      permissions={[PERMISSIONS.staffProfile.read, PERMISSIONS.staffProfile.update]}
    />
  )
}
