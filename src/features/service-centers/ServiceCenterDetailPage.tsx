import { useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Menu,
  MenuItem,
  MenuSeparator,
  StatTile,
  Tabs,
  useToast,
  type TabDefinition,
} from '@/components/ui'
import { AlertIcon, BuildingIcon, ChevronDownIcon } from '@/components/icons'
import { formatCurrency } from '@/components/charts'
import { Can, PERMISSIONS as P, access, useAccess } from '@/lib/access'
import { evaluate } from '@/lib/access/policy'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, getRouteEntry, to } from '@/lib/routing'
import {
  useDeleteServiceCenter,
  useServiceCenter,
  useServiceCenterStats,
  useVerifyServiceCenter,
} from './api'
import { EditServiceCenterDialog } from './components/EditServiceCenterDialog'
import { centerStatus, formatAddress } from './serviceCenter'

export interface ServiceCenterOutletContext {
  serviceCenterId: string
}

/**
 * Layout for a single service center.
 *
 * Tabs are child routes filtered through the same access rules that guard
 * them, so "Settings" is simply absent for someone who couldn't change them.
 * The figures come from `/stats`, which is maintained server-side, with the
 * currency taken from the center's own settings rather than assumed.
 */
export default function ServiceCenterDetailPage() {
  const { serviceCenterId = '' } = useParams()
  const { session, capabilities, isFlagEnabled } = useAccess()
  const navigate = useNavigate()
  const toast = useToast()

  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  const { data: center, isLoading, isError, error } = useServiceCenter(serviceCenterId)
  const stats = useServiceCenterStats(serviceCenterId)
  const verify = useVerifyServiceCenter()
  const deleteCenter = useDeleteServiceCenter()
  const apiError = asApiError(error)

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

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Service center" backTo={ROUTE_PATHS.serviceCenters} backLabel="All centers" />
        <Card>
          <EmptyState
            icon={AlertIcon}
            title={apiError?.kind === 'not_found' ? 'Service center not found' : 'Couldn’t load this center'}
            description={
              apiError?.kind === 'not_found'
                ? 'It may have been removed, or the link may be wrong.'
                : (apiError?.userMessage ?? 'Try again in a moment.')
            }
            action={
              <Button asChild variant="secondary" size="sm">
                <a href={ROUTE_PATHS.serviceCenters}>Back to service centers</a>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const status = center ? centerStatus(center) : undefined
  const address = center ? formatAddress(center.address) : undefined
  const currency = center?.settings?.currency
  const rating = stats.data?.averageRating ?? center?.stats?.averageRating

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo={ROUTE_PATHS.serviceCenters}
        backLabel="All centers"
        title={
          isLoading ? (
            <span className="skeleton inline-block h-6 w-48 align-middle" />
          ) : (
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar name={center?.name ?? 'Center'} size="lg" />
              <span className="truncate">{center?.name}</span>
            </span>
          )
        }
        meta={
          center && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
              {address ? <span>{address}</span> : null}
            </span>
          )
        }
        actions={
          center && (
            <Can
              rule={access.anyPermission(P.serviceCenter.update, P.serviceCenter.manage)}
            >
              <Menu
                trigger={
                  <Button size="sm" variant="secondary">
                    Manage
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <Can rule={access.permission(P.serviceCenter.update)}>
                  <MenuItem onSelect={() => setDialog('edit')}>Edit details</MenuItem>
                </Can>
                <Can rule={access.permission(P.serviceCenter.manage)}>
                  <MenuItem
                    onSelect={() =>
                      verify.mutate(center._id, {
                        onSuccess: () => toast.success('Verification requested'),
                      })
                    }
                  >
                    Verify center
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem danger onSelect={() => setDialog('delete')}>
                    Delete center
                  </MenuItem>
                </Can>
              </Menu>
            </Can>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Vehicles served"
          value={stats.isError ? '—' : (stats.data?.totalVehiclesServed ?? 0)}
          sub={stats.data ? `${stats.data.activeVehicles} active` : undefined}
          loading={stats.isLoading}
        />
        <StatTile
          label="Service records"
          value={stats.isError ? '—' : (stats.data?.totalServiceRecords ?? 0)}
          loading={stats.isLoading}
        />
        <StatTile
          label="Rating"
          value={rating ? `${rating.toFixed(1)}★` : '—'}
          loading={stats.isLoading && isLoading}
        />
        <StatTile
          label="Revenue"
          value={
            stats.isError ? '—' : formatCurrency(stats.data?.totalRevenue ?? 0, currency)
          }
          loading={stats.isLoading}
        />
      </div>

      <Tabs tabs={tabs} />

      {isLoading ? (
        <div className="skeleton h-64 rounded-card" />
      ) : center ? (
        <Outlet context={{ serviceCenterId } satisfies ServiceCenterOutletContext} />
      ) : (
        <Card>
          <EmptyState icon={BuildingIcon} title="No service center" />
        </Card>
      )}

      {center && (
        <>
          <EditServiceCenterDialog
            center={center}
            open={dialog === 'edit'}
            onClose={() => setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === 'delete'}
            onClose={() => setDialog(null)}
            loading={deleteCenter.isPending}
            danger
            title="Delete this service center?"
            description={`${center.name} and its offered services are removed. Staff and service records that point at it keep their history.`}
            confirmLabel="Delete"
            onConfirm={() =>
              deleteCenter.mutate(center._id, {
                onSuccess: () => {
                  toast.success('Service center deleted')
                  navigate(ROUTE_PATHS.serviceCenters, { replace: true })
                },
              })
            }
          />
        </>
      )}
    </div>
  )
}
