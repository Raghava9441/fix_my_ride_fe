import { AuthPlaceholder } from './AuthPlaceholder'

export default function VerifyEmailPage() {
  return (
    <AuthPlaceholder
      title="Verify email"
      description="Consumes the token from the emailed link and confirms the address."
      endpoints={['GET /api/v1/auth/verify-email', 'POST /api/v1/auth/resend-verification']}
    />
  )
}
