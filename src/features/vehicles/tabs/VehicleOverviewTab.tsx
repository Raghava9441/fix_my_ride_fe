import { Card, CardBody, CardHeader } from '@/components/ui'

export default function VehicleOverviewTab() {
  return (
    <Card>
      <CardHeader title="Overview" description="Specification, odometer, warranty, and insurance." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET /api/v1/vehicles/:id</code>
        <code className="font-mono">GET /api/v1/vehicles/:id/odometer-readings</code>
        <code className="font-mono">GET /api/v1/vehicles/:id/warranty</code>
        <code className="font-mono">GET /api/v1/vehicles/:id/insurance</code>
      </CardBody>
    </Card>
  )
}
