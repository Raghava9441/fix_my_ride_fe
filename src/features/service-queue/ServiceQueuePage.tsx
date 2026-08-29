import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function ServiceQueuePage() {
  return (
    <PlaceholderPage
      title="Service queue"
      description="Live board of work in the bays, grouped by status."
      endpoints={['GET /api/v1/service-records?status=in_progress', 'PATCH /api/v1/service-records/:id/status']}
      permissions={[PERMISSIONS.serviceRecord.readAll, PERMISSIONS.serviceRecord.update]}
      notes={
        <>
          Behind the <code className="font-mono text-xs">serviceQueue</code> flag, which is off by default. There is no
          queue endpoint yet, so this board would have to be assembled by filtering the service-record list client-side.
          The route ships regardless, so the work can land incrementally behind one boolean instead of on a long-lived
          branch.
        </>
      }
    />
  )
}
