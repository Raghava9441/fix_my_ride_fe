import { AuthPlaceholder } from '@/features/auth/AuthPlaceholder'

export default function OnboardingPage() {
  return (
    <AuthPlaceholder
      title="Set up your workspace"
      description="Creates the tenant and its first owner account. The workspace stays pending until a platform admin approves it."
      endpoints={['POST /api/v1/onboarding/signup', 'GET /api/v1/onboarding/status']}
    />
  )
}
