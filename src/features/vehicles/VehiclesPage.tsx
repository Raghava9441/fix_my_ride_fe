import { Badge, Card, CardBody, CardHeader } from '@/components/ui'
import { useVehicles } from './api'

export function VehiclesPage() {
  const { data: vehicles, isLoading, isError, error } = useVehicles()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl">Vehicles</h1>
        <p className="mt-1 text-sm text-text-muted">Everything registered for your service center.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-[15px]">All vehicles</h2>
          <span className="text-xs text-text-faint">{vehicles ? `${vehicles.length} total` : ''}</span>
        </CardHeader>

        {isLoading && <CardBody className="text-sm text-text-muted">Loading vehicles…</CardBody>}

        {isError && (
          <CardBody className="text-sm text-critical">
            Couldn't load vehicles{error instanceof Error ? `: ${error.message}` : '.'}
          </CardBody>
        )}

        {vehicles?.length === 0 && (
          <CardBody className="text-sm text-text-muted">No vehicles yet.</CardBody>
        )}

        {vehicles?.map((vehicle) => (
          <div
            key={vehicle._id}
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div>
              <div className="text-sm font-semibold">
                {vehicle.make} {vehicle.model} · {vehicle.year}
              </div>
              <div className="font-mono text-xs text-text-muted">{vehicle.registrationNumber}</div>
            </div>
            <div className="flex items-center gap-3">
              {vehicle.currentOdometer && (
                <span className="tabnum font-mono text-sm text-text-muted">
                  {vehicle.currentOdometer.value.toLocaleString()} {vehicle.currentOdometer.unit}
                </span>
              )}
              <Badge tone="neutral">{vehicle.fuelType}</Badge>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
