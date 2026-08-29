import { Outlet, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Tabs, type TabDefinition } from '@/components/ui'
import { useAccess } from '@/lib/access'
import { evaluate } from '@/lib/access/policy'
import { getRouteEntry, to } from '@/lib/routing'

/**
 * Same shape as the vehicle detail layout: tabs are child routes, and the
 * visible set is filtered through each route's compiled access rule. The
 * "Center settings" tab therefore appears only for someone who could
 * actually open it — a manager, not a technician.
 */
export default function ServiceCenterDetailPage() {
  const { serviceCenterId = '' } = useParams()
  const { session, capabilities, isFlagEnabled } = useAccess()

  const candidates: { routeId: string; tab: TabDefinition }[] = [
    {
      routeId: 'serviceCenters.detail.overview',
      tab: { to: to.serviceCenterDetail(serviceCenterId), label: 'Overview', end: true },
    },
    {
      routeId: 'serviceCenters.detail.staff',
      tab: { to: to.serviceCenterStaff(serviceCenterId), label: 'Staff' },
    },
    {
      routeId: 'serviceCenters.detail.settings',
      tab: { to: to.serviceCenterSettings(serviceCenterId), label: 'Settings' },
    },
  ]

  const tabs = candidates
    .filter(({ routeId }) => {
      const entry = getRouteEntry(routeId)
      return entry ? evaluate(entry.access, { session, capabilities, isFlagEnabled }).allowed : false
    })
    .map(({ tab }) => tab)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Service center"
        description={
          <>
            Center <code className="font-mono text-xs">{serviceCenterId}</code>
          </>
        }
        meta={<Badge tone="neutral">Detail</Badge>}
      />

      <Tabs tabs={tabs} />

      <Outlet context={{ serviceCenterId }} />
    </div>
  )
}
