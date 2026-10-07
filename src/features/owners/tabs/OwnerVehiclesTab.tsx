import { Link, useOutletContext } from 'react-router-dom'
import { Badge, Card, CardBody, EmptyState, SkeletonRows } from '@/components/ui'
import { VehicleIcon } from '@/components/icons'
import { asApiError } from '@/lib/queryClient'
import { to } from '@/lib/routing'
import { usePrefetchVehicle } from '@/features/vehicles/api'
import type { OwnerOutletContext } from '../OwnerDetailPage'
import { useOwnerVehicles } from '../api'

/**
 * Every vehicle registered to this customer.
 *
 * Rows mirror the main vehicles list rather than inventing a second visual
 * language for the same record — someone who has learned to scan one should
 * not have to re-learn the other. The odometer is the one extra fact worth
 * the width here, since "when did we last see this car" is the question that
 * usually follows.
 */
export default function OwnerVehiclesTab() {
  const { ownerId } = useOutletContext<OwnerOutletContext>()
  const { data, isLoading, isError, error } = useOwnerVehicles(ownerId)
  const prefetchVehicle = usePrefetchVehicle()
  const apiError = asApiError(error)

  return (
    <Card>
      {isLoading && (
        <CardBody>
          <SkeletonRows rows={4} />
        </CardBody>
      )}

      {isError && (
        <CardBody className="flex flex-col gap-2 text-sm">
          <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load vehicles.'}</p>
          {apiError?.requestId && (
            <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
          )}
        </CardBody>
      )}

      {data?.items.length === 0 && (
        <EmptyState
          icon={VehicleIcon}
          title="No vehicles"
          description="Nothing is registered to this customer yet. Vehicles added to their account will appear here."
        />
      )}

      {data?.items.map((vehicle) => (
        <Link
          key={vehicle._id}
          to={to.vehicleDetail(vehicle._id)}
          onMouseEnter={() => prefetchVehicle(vehicle._id)}
          onFocus={() => prefetchVehicle(vehicle._id)}
          className="interactive group flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-sunken"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold group-hover:text-accent">
              {vehicle.make} {vehicle.model} · {vehicle.year}
            </div>
            <div className="font-mono text-xs text-text-muted">{vehicle.registrationNumber}</div>
          </div>
          <div className="flex flex-none items-center gap-3">
            {vehicle.currentOdometer && (
              <span className="tabnum hidden font-mono text-sm text-text-muted sm:inline">
                {vehicle.currentOdometer.value.toLocaleString()} {vehicle.currentOdometer.unit}
              </span>
            )}
            <Badge tone="neutral">{vehicle.fuelType}</Badge>
          </div>
        </Link>
      ))}
    </Card>
  )
}
