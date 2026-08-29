import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function ProfilePage() {
  return (
    <PlaceholderPage
      title="Your profile"
      description="Name, contact details, and notification preferences."
      endpoints={['GET /api/v1/auth/me', 'PUT /api/v1/auth/me', 'GET /api/v1/owners/:id/preferences']}
    />
  )
}
