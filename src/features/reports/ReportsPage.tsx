import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Revenue, throughput, staff performance, and customer satisfaction, with CSV export."
      endpoints={[
        'GET  /api/v1/reports/dashboard',
        'GET  /api/v1/reports/service-center/revenue',
        'GET  /api/v1/reports/service-center/staff-performance',
        'GET  /api/v1/reports/owner/expenses',
        'POST /api/v1/reports/export',
      ]}
      permissions={[PERMISSIONS.report.read, PERMISSIONS.report.readAll]}
      notes="The report routes are namespaced /service-center, /owner, and /admin, but that split is a naming convention on the API side rather than an enforced one: all of them are behind plain authentication. Which sections this screen shows should follow the permission set, not the URL prefix."
    />
  )
}
