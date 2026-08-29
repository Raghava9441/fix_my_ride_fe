import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function SecurityPage() {
  return (
    <PlaceholderPage
      title="Security"
      description="Password, two-factor authentication, and backup codes."
      endpoints={[
        'POST /api/v1/auth/change-password',
        'POST /api/v1/auth/mfa/setup',
        'POST /api/v1/auth/mfa/enable',
        'POST /api/v1/auth/mfa/disable',
        'POST /api/v1/auth/mfa/backup-codes',
      ]}
    />
  )
}
