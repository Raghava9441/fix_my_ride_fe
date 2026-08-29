import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function StaffPage() {
  return (
    <PlaceholderPage
      title="Staff"
      description="Technicians, advisors, and managers, with their roles, schedules, and performance."
      endpoints={[
        'GET  /api/v1/staff',
        'POST /api/v1/staff',
        'GET  /api/v1/staff/:id/permissions',
        'GET  /api/v1/staff/:id/schedule',
        'GET  /api/v1/staff/:id/performance',
      ]}
      permissions={[PERMISSIONS.staffProfile.read, PERMISSIONS.staffProfile.manage]}
      notes={
        <>
          Worth knowing before this screen is built: the API mounts the staff router behind
          <code className="mx-1 font-mono text-xs">authenticate</code> only, with no role or permission check, so any
          authenticated account in the tenant can currently create and delete staff. The gate this screen applies is a
          UX convention, not enforcement.
        </>
      }
    />
  )
}
