import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function InvoicesPage() {
  return (
    <PlaceholderPage
      title="Invoices"
      description="Issued invoices, their payment state, and the jobs behind them."
      endpoints={[
        'GET  /api/v1/invoices',
        'POST /api/v1/invoices',
        'POST /api/v1/invoices/:id/send',
        'POST /api/v1/invoices/:id/void',
        'POST /api/v1/invoices/:id/pay',
      ]}
      permissions={[PERMISSIONS.billing.read, PERMISSIONS.billing.manage]}
      notes="Creating, sending, and voiding are the API's staff-or-admin routes; reading and paying are open to any authenticated account. Reflect that split in the actions on this screen."
    />
  )
}
