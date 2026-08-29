import { AuthPlaceholder } from './AuthPlaceholder'

export default function ForgotPasswordPage() {
  return (
    <AuthPlaceholder
      title="Reset password"
      description="Sends a reset link. The response is intentionally identical whether or not the address exists."
      endpoints={['POST /api/v1/auth/forgot-password']}
    />
  )
}
