import { Outlet, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Tabs, type TabDefinition } from '@/components/ui'
import { Can, PERMISSIONS, access, useAccess } from '@/lib/access'
import { Button } from '@/components/ui'
import { ROUTE_PATHS, getRouteEntry, to } from '@/lib/routing'
import { evaluate } from '@/lib/access/policy'

/**
 * Layout for a single vehicle. The tabs below it are real child routes, so
 * each one is linkable, back-button friendly, and independently guarded.
 *
 * The tab list is filtered by the same rules that guard the routes —
 * `getRouteEntry(id).access` is the *effective* rule the router compiled, so
 * a tab is shown exactly when clicking it would work. Nobody has to remember
 * to keep a second list in sync.
 */
export default function VehicleDetailPage() {
  const { vehicleId = '' } = useParams()
  const { session, capabilities, isFlagEnabled } = useAccess()

  const candidates: { routeId: string; tab: TabDefinition }[] = [
    {
      routeId: 'vehicles.detail.overview',
      tab: { to: to.vehicleDetail(vehicleId), label: 'Overview', end: true },
    },
    {
      routeId: 'vehicles.detail.serviceHistory',
      tab: { to: to.vehicleServiceHistory(vehicleId), label: 'Service history' },
    },
    {
      routeId: 'vehicles.detail.documents',
      tab: { to: to.vehicleDocuments(vehicleId), label: 'Documents' },
    },
    {
      routeId: 'vehicles.detail.reminders',
      tab: { to: to.vehicleReminders(vehicleId), label: 'Reminders' },
    },
  ]

  const tabs = candidates
    .filter(({ routeId }) => {
      const entry = getRouteEntry(routeId)
      if (!entry) return false
      return evaluate(entry.access, { session, capabilities, isFlagEnabled }).allowed
    })
    .map(({ tab }) => tab)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Vehicle"
        description={
          <>
            Record <code className="font-mono text-xs">{vehicleId}</code>
          </>
        }
        meta={<Badge tone="neutral">Detail</Badge>}
        actions={
          <Can rule={access.permission(PERMISSIONS.vehicle.update)} mode="disable">
            <Button variant="secondary" size="sm">
              Edit vehicle
            </Button>
          </Can>
        }
      />

      <Tabs tabs={tabs} />

      <Outlet context={{ vehicleId, listPath: ROUTE_PATHS.vehicles }} />
    </div>
  )
}
