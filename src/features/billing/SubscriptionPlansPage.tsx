import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function SubscriptionPlansPage() {
  return (
    <PlaceholderPage
      title="Plans"
      description="Plan comparison, feature limits, and pricing."
      endpoints={['GET /api/v1/subscription-plans', 'GET /api/v1/subscription-plans/compare']}
    />
  )
}
