import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardBody, EmptyState, SkeletonRows } from '@/components/ui'
import { VehicleIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { ROUTE_PATHS, to } from '@/lib/routing'
import { useVehicles } from './api'

export default function VehiclesPage() {
  const { data: vehicles, isLoading, isError, error } = useVehicles()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Vehicles"
        description="Everything registered across your service centers."
        meta={vehicles && <Badge tone="neutral">{vehicles.length} total</Badge>}
        actions={
          <Can rule={access.permission(PERMISSIONS.vehicle.create)} mode="disable">
            <Button asChild size="sm">
              <Link to={ROUTE_PATHS.vehicleNew}>Add vehicle</Link>
            </Button>
          </Can>
        }
      />

      <Card>
        {isLoading && <CardBody><SkeletonRows rows={6} /></CardBody>}

        {isError && (
          <CardBody className="text-sm text-critical">
            Couldn’t load vehicles{error instanceof Error ? `: ${error.message}` : '.'}
          </CardBody>
        )}

        {vehicles?.length === 0 && (
          <EmptyState
            icon={VehicleIcon}
            title="No vehicles yet"
            description="Vehicles appear here once they're registered to a customer or authorised for one of your centers."
            action={
              <Can rule={access.permission(PERMISSIONS.vehicle.create)}>
                <Button asChild size="sm" variant="secondary">
                  <Link to={ROUTE_PATHS.vehicleNew}>Add the first one</Link>
                </Button>
              </Can>
            }
          />
        )}

        {vehicles?.map((vehicle) => (
          <Link
            key={vehicle._id}
            to={to.vehicleDetail(vehicle._id)}
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
    </div>
  )
}
