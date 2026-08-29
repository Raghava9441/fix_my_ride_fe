import { Card, CardBody, CardHeader } from '@/components/ui'

export default function CenterSettingsTab() {
  return (
    <Card>
      <CardHeader title="Center settings" description="Operating hours, capacity, and service catalogue." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET /api/v1/service-centers/:id/settings</code>
        <code className="font-mono">PUT /api/v1/service-centers/:id/settings</code>
      </CardBody>
    </Card>
  )
}
