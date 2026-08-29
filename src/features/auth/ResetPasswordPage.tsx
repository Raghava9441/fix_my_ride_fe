import { AuthPlaceholder } from './AuthPlaceholder'

export default function ResetPasswordPage() {
  return (
    <AuthPlaceholder
      title="Choose a new password"
      description="Entered from an emailed link, so this route is public rather than signed-out-only."
      endpoints={['POST /api/v1/auth/reset-password']}
    />
  )
}
