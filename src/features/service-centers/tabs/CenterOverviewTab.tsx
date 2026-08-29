import { Card, CardBody, CardHeader } from '@/components/ui'

export default function CenterOverviewTab() {
  return (
    <Card>
      <CardHeader title="Overview" description="Location, services offered, reviews, and throughput." />
      <CardBody className="flex flex-col gap-1.5 text-xs text-text-muted">
        <code className="font-mono">GET /api/v1/service-centers/:id</code>
        <code className="font-mono">GET /api/v1/service-centers/:id/services</code>
        <code className="font-mono">GET /api/v1/service-centers/:id/reviews</code>
        <code className="font-mono">GET /api/v1/service-centers/:id/stats</code>
      </CardBody>
    </Card>
  )
}
