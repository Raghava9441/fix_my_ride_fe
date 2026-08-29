import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function DocumentsPage() {
  return (
    <PlaceholderPage
      title="Documents"
      description="Files attached to vehicles, service records, and service centers."
      endpoints={['GET /api/v1/documents', 'GET /api/v1/documents/:id', 'GET /api/v1/documents/:id/download']}
      notes="One of the few places the API does a real per-resource authorization check: the document controller calls document.isAccessibleBy(userId, role) before returning or streaming a file, so a 403 here is genuine rather than advisory."
    />
  )
}
