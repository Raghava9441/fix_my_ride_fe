import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardBody, EmptyState, SkeletonRows } from '@/components/ui'
import { VehicleIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, to } from '@/lib/routing'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useVehicles, usePrefetchVehicle } from './api'

const PAGE_SIZE = 20

export default function VehiclesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /*
   * Debounced in the component, not in the query. The delay is a UI decision
   * — how long to wait after a keystroke — while making sure the newest term
   * wins is the query layer's job, handled by the per-key AbortSignal in
   * `useVehicles`. Splitting it that way means the race is fixed even if a
   * future caller forgets to debounce.
   */
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, error, isPlaceholderData } = useVehicles({
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const prefetchVehicle = usePrefetchVehicle()
  const apiError = asApiError(error)
  const vehicles = data?.items
  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Vehicles"
        description="Everything registered across your service centers."
        meta={pagination && <Badge tone="neutral">{pagination.total} total</Badge>}
        actions={
          <Can rule={access.permission(PERMISSIONS.vehicle.create)} mode="disable">
            <Button asChild size="sm">
              <Link to={ROUTE_PATHS.vehicleNew}>Add vehicle</Link>
            </Button>
          </Can>
        }
      />

      <input
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        placeholder="Search registration, make, or model"
        aria-label="Search vehicles"
        className="interactive w-full max-w-sm rounded-input border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent"
      />

      {/* Dimmed rather than replaced while the next page loads — the previous
          page stays readable instead of flashing to a skeleton. */}
      <Card className={isPlaceholderData ? 'opacity-60' : undefined}>
        {isLoading && (
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        )}

        {isError && (
          <CardBody className="flex flex-col gap-2 text-sm">
            {/* `userMessage`, not the raw server message: a 500's text can
                carry internals, and every error kind gets a sentence that
                says what to do next. */}
            <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load vehicles.'}</p>
            {apiError?.requestId && (
              <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </CardBody>
        )}

        {vehicles?.length === 0 && (
          <EmptyState
            icon={VehicleIcon}
            title={debouncedSearch ? 'No matches' : 'No vehicles yet'}
            description={
              debouncedSearch
                ? `Nothing matched “${debouncedSearch}”. Try a registration number or make.`
                : "Vehicles appear here once they're registered to a customer or authorised for one of your centers."
            }
            action={
              !debouncedSearch && (
                <Can rule={access.permission(PERMISSIONS.vehicle.create)}>
                  <Button asChild size="sm" variant="secondary">
                    <Link to={ROUTE_PATHS.vehicleNew}>Add the first one</Link>
                  </Button>
                </Can>
              )
            }
          />
        )}

        {vehicles?.map((vehicle) => (
          <Link
            key={vehicle._id}
            to={to.vehicleDetail(vehicle._id)}
            // Warms the detail cache before the click lands, so the next
            // screen usually renders with data instead of a skeleton.
            onMouseEnter={() => prefetchVehicle(vehicle._id)}
            onFocus={() => prefetchVehicle(vehicle._id)}
            className="interactive flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-sunken"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.hasPrevious}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
