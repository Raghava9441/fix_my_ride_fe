import { Card, CardBody, CardHeader } from '@/components/ui'

export default function VehicleDocumentsTab() {
  return (
    <Card>
      <CardHeader title="Documents" description="Registration, insurance, and service paperwork." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET  /api/v1/vehicles/:id/documents</code>
        <code className="font-mono">POST /api/v1/vehicles/:id/documents</code>
      </CardBody>
    </Card>
  )
}
