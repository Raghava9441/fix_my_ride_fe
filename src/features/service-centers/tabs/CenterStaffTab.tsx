import { Card, CardBody, CardHeader } from '@/components/ui'

export default function CenterStaffTab() {
  return (
    <Card>
      <CardHeader title="Staff" description="Who works at this center, and in what role." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET /api/v1/service-centers/:id/staff</code>
      </CardBody>
    </Card>
  )
}
