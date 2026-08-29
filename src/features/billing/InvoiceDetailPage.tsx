import { useParams } from 'react-router-dom'
import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams()

  return (
    <PlaceholderPage
      title="Invoice"
      description={`Invoice ${invoiceId ?? ''} — line items, payment history, and delivery state.`}
      endpoints={['GET /api/v1/invoices/:id', 'POST /api/v1/invoices/:id/pay', 'POST /api/v1/invoices/:id/send']}
      permissions={[PERMISSIONS.billing.read]}
    />
  )
}
