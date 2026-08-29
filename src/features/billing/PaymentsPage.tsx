import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function PaymentsPage() {
  return (
    <PlaceholderPage
      title="Payments"
      description="Transactions captured through the payment gateway, reconciled against invoices."
      endpoints={['GET /api/v1/payments/mine', 'GET /api/v1/payments/stats', 'GET /api/v1/payments/:id']}
      permissions={[PERMISSIONS.billing.read]}
      notes="The unscoped GET /payments list is admin-only; everyone else reads /payments/mine. Pick the endpoint from the session rather than showing an empty table to non-admins."
    />
  )
}
