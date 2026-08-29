import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function WorkspaceSettingsPage() {
  return (
    <PlaceholderPage
      title="Workspace"
      description="Organisation profile, branding, and defaults for every service center in it."
      endpoints={['GET /api/v1/tenants/me', 'PATCH /api/v1/tenants/me']}
      notes="PATCH /tenants/me is one of the endpoints the API really does gate, on the owner role, so this screen is role-gated to match rather than permission-gated."
    />
  )
}
