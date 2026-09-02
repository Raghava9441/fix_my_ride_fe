import { useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Menu,
  MenuItem,
  MenuSeparator,
  Tabs,
  useToast,
  type TabDefinition,
} from '@/components/ui'
import { AlertIcon, ChevronDownIcon, VehicleIcon } from '@/components/icons'
import { Can, PERMISSIONS, access, useAccess } from '@/lib/access'
import { evaluate } from '@/lib/access/policy'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, getRouteEntry, to } from '@/lib/routing'
import { useDeleteVehicle, useVehicle } from './api'
import { EditVehicleDialog } from './components/EditVehicleDialog'
import { RecordOdometerDialog } from './components/RecordOdometerDialog'
import { TransferOwnershipDialog } from './components/TransferOwnershipDialog'

type DialogName = 'edit' | 'odometer' | 'transfer' | 'delete' | null

/**
 * Layout for a single vehicle.
 *
 * The tabs below are real child routes, so each is linkable, back-button
 * friendly, and independently guarded. The tab list is filtered by the same
 * rules that guard those routes — `getRouteEntry(id).access` is the *effective*
 * rule the router compiled — so a tab appears exactly when clicking it would
 * work, and nobody has to keep a second list in sync.
 *
 * The vehicle itself is fetched here and handed to the tabs through the outlet
 * context. Each tab could fetch it again and TanStack Query would dedupe by
 * key, but passing it down makes the dependency explicit and means a tab
 * switch never flashes a loading state for data that's already in hand.
 */
export default function VehicleDetailPage() {
  const { vehicleId = '' } = useParams()
  const { session, capabilities, isFlagEnabled } = useAccess()
  const navigate = useNavigate()
  const toast = useToast()

  const [dialog, setDialog] = useState<DialogName>(null)

  const { data: vehicle, isLoading, isError, error } = useVehicle(vehicleId)
  const deleteVehicle = useDeleteVehicle()
  const apiError = asApiError(error)

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

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Vehicle" backTo={ROUTE_PATHS.vehicles} backLabel="All vehicles" />
        <Card>
          <EmptyState
            icon={AlertIcon}
            title={apiError?.kind === 'not_found' ? 'Vehicle not found' : 'Couldn’t load this vehicle'}
            description={
              apiError?.kind === 'not_found'
                ? 'It may have been deleted, or the link may be wrong.'
                : (apiError?.userMessage ?? 'Try again in a moment.')
            }
            action={
              <Button asChild variant="secondary" size="sm">
                <a href={ROUTE_PATHS.vehicles}>Back to vehicles</a>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const title = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehicle'
  const odometer = vehicle?.currentOdometer

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={isLoading ? <span className="skeleton inline-block h-6 w-48 align-middle" /> : title}
        backTo={ROUTE_PATHS.vehicles}
        backLabel="All vehicles"
        description={
          vehicle && (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono font-semibold text-text">{vehicle.registrationNumber}</span>
              <span aria-hidden>·</span>
              <span>{vehicle.year}</span>
              {odometer && (
                <>
                  <span aria-hidden>·</span>
                  <span className="tabnum">
                    {odometer.value.toLocaleString()} {odometer.unit}
                  </span>
                </>
              )}
            </span>
          )
        }
        meta={
          vehicle && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{vehicle.fuelType}</Badge>
              {vehicle.transmission && <Badge tone="neutral">{vehicle.transmission}</Badge>}
              {vehicle.color && <Badge tone="neutral">{vehicle.color}</Badge>}
            </div>
          )
        }
        actions={
          vehicle && (
            <div className="flex items-center gap-2">
              <Can rule={access.permission(PERMISSIONS.vehicle.update)}>
                <Button variant="secondary" size="sm" onClick={() => setDialog('odometer')}>
                  Record odometer
                </Button>
              </Can>

              {/*
                Everything past the primary action lives in a menu. Six buttons
                in a header is unusable on a phone, and only one of them is
                what you came to do.
              */}
              <Menu
                trigger={
                  <Button variant="secondary" size="sm" aria-label="Vehicle actions">
                    Actions
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <Can rule={access.permission(PERMISSIONS.vehicle.update)}>
                  <MenuItem onSelect={() => setDialog('edit')}>Edit details</MenuItem>
                </Can>
                <Can rule={access.permission(PERMISSIONS.vehicle.update)}>
                  <MenuItem onSelect={() => setDialog('transfer')}>Transfer ownership</MenuItem>
                </Can>
                <Can rule={access.permission(PERMISSIONS.vehicle.delete)}>
                  <MenuSeparator />
                  <MenuItem danger onSelect={() => setDialog('delete')}>
                    Delete vehicle
                  </MenuItem>
                </Can>
              </Menu>
            </div>
          )
        }
      />

      <Tabs tabs={tabs} />

      {isLoading ? (
        <div className="skeleton h-64 rounded-card" />
      ) : vehicle ? (
        <Outlet context={{ vehicleId, vehicle, listPath: ROUTE_PATHS.vehicles }} />
      ) : (
        <Card>
          <EmptyState icon={VehicleIcon} title="No vehicle" />
        </Card>
      )}

      {vehicle && (
        <>
          <EditVehicleDialog
            vehicle={vehicle}
            open={dialog === 'edit'}
            onClose={() => setDialog(null)}
          />
          <RecordOdometerDialog
            vehicle={vehicle}
            open={dialog === 'odometer'}
            onClose={() => setDialog(null)}
          />
          <TransferOwnershipDialog
            vehicle={vehicle}
            open={dialog === 'transfer'}
            onClose={() => setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === 'delete'}
            onClose={() => setDialog(null)}
            loading={deleteVehicle.isPending}
            title="Delete this vehicle?"
            description={`${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber}) will be removed, along with its link to any service history. This can’t be undone.`}
            confirmLabel="Delete vehicle"
            onConfirm={() =>
              deleteVehicle.mutate(vehicle._id, {
                onSuccess: () => {
                  toast.success('Vehicle deleted', vehicle.registrationNumber)
                  // `replace` so the back button doesn't return to a detail
                  // page for a record that no longer exists.
                  navigate(ROUTE_PATHS.vehicles, { replace: true })
                },
                onError: (err) => toast.error('Couldn’t delete vehicle', err.userMessage),
              })
            }
          />
        </>
      )}
    </div>
  )
}

/** Shape the tabs receive from the outlet. */
export interface VehicleOutletContext {
  vehicleId: string
  vehicle: import('./types').Vehicle
  listPath: string
}
