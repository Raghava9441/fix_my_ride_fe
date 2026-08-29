import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function AdminOverviewPage() {
  return (
    <PlaceholderPage
      title="Platform"
      description="Cross-tenant view: workspaces, accounts, and system state."
      endpoints={['GET /api/v1/admin/dashboard', 'GET /api/v1/admin/stats']}
      permissions={[PERMISSIONS.system.admin]}
      notes="The whole /admin router is genuinely gated server-side (authenticate + requireRole('admin')), so this is one subtree where the client and server agree on who gets in."
    />
  )
}
