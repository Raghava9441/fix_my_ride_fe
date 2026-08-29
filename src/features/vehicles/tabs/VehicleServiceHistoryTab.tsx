import { Card, CardBody, CardHeader } from '@/components/ui'

export default function VehicleServiceHistoryTab() {
  return (
    <Card>
      <CardHeader title="Service history" description="Every job recorded against this vehicle." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET /api/v1/vehicles/:id/service-records</code>
      </CardBody>
    </Card>
  )
}
