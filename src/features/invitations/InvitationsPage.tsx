import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function InvitationsPage() {
  return (
    <PlaceholderPage
      title="Invitations"
      description="Pending and expired invites, with resend and revoke."
      endpoints={[
        'GET  /api/v1/invitations',
        'POST /api/v1/invitations',
        'POST /api/v1/invitations/:id/resend',
        'POST /api/v1/invitations/:id/revoke',
      ]}
      permissions={[PERMISSIONS.staffProfile.create, PERMISSIONS.staffProfile.manage]}
    />
  )
}
