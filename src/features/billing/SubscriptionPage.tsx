import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function SubscriptionPage() {
  return (
    <PlaceholderPage
      title="Subscription"
      description="The workspace's current plan, renewal date, and usage against its limits."
      endpoints={[
        'GET  /api/v1/subscriptions/me',
        'POST /api/v1/subscriptions/subscribe',
        'POST /api/v1/subscriptions/:id/cancel',
      ]}
      notes="Gated on the owner or admin account role rather than a permission, because subscribe is one of the few endpoints the API genuinely enforces with requireRole."
    />
  )
}
