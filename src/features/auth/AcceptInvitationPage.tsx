import { AuthPlaceholder } from './AuthPlaceholder'

export default function AcceptInvitationPage() {
  return (
    <AuthPlaceholder
      title="Accept invitation"
      description="Validates the invite before asking for an account, so an expired link fails early rather than after a form."
      endpoints={[
        'GET /api/v1/invitations/validate',
        'POST /api/v1/invitations/:id/accept',
        'POST /api/v1/invitations/:id/decline',
      ]}
    />
  )
}
