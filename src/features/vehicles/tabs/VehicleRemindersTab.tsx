import { Card, CardBody, CardHeader } from '@/components/ui'

export default function VehicleRemindersTab() {
  return (
    <Card>
      <CardHeader title="Reminders" description="Scheduled service reminders for this vehicle." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET /api/v1/vehicles/:id/reminders</code>
      </CardBody>
    </Card>
  )
}
