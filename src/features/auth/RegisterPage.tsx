import { AuthPlaceholder } from './AuthPlaceholder'

export default function RegisterPage() {
  return (
    <AuthPlaceholder
      title="Create account"
      description="Self-serve signup for an individual vehicle owner. Workspace signup goes through onboarding instead."
      endpoints={['POST /api/v1/auth/register', 'POST /api/v1/auth/resend-verification']}
    />
  )
}
