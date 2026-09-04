import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Field, PasswordInput, PasswordRules } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'
import { isPasswordAcceptable } from '@/lib/auth/passwordPolicy'
import { useResetPassword } from './api'
import { AuthCard } from './components/AuthCard'
import { authErrorMessage, errorReference } from './authErrors'

/**
 * Chooses a new password from an emailed link.
 *
 * Reachable signed in *or* out (the route is `access.public()`): someone who
 * is still signed in on this device can legitimately follow a reset link, and
 * bouncing them to the dashboard would strand them.
 *
 * ---- On success it sends the user to sign in, rather than signing them in ----
 *
 * `POST /auth/reset-password` returns no tokens, and that is the right
 * design: proving control of an inbox is not the same as proving knowledge of
 * the new password. Making them sign in once with what they just chose also
 * confirms they recorded it — the alternative is a user who is signed in on
 * this device and locked out everywhere else.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const resetPassword = useResetPassword()

  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const passwordOk = isPasswordAcceptable(password)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!passwordOk || !token || resetPassword.isPending) return
    try {
      await resetPassword.mutateAsync({ token, password })
    } catch {
      // Surfaced from `resetPassword.error` below.
    }
  }

  /*
   * A link with no token can't succeed, so the form is never shown for one.
   * Rendering it anyway and failing on submit wastes the user's time typing a
   * password that was never going to be accepted — and the real fix (request
   * a fresh link) is nowhere on that screen.
   */
  if (!token) {
    return (
      <AuthCard title="Link isn’t valid">
        <Alert tone="warning" title="Something's missing from this link">
          It may have been truncated by your email client, or copied incompletely. Request a new one and
          open it directly from the email.
        </Alert>
        <Button asChild className="w-full">
          <Link to={ROUTE_PATHS.forgotPassword}>Request a new link</Link>
        </Button>
      </AuthCard>
    )
  }

  if (resetPassword.isSuccess) {
    return (
      <AuthCard title="Password updated">
        <Alert tone="success">
          Your password has been changed. Sign in with it to continue.
        </Alert>
        <Button className="w-full" onClick={() => navigate(ROUTE_PATHS.login, { replace: true })}>
          Go to sign in
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick something you haven’t used on this account before."
      footer={
        <Link to={ROUTE_PATHS.login} className="interactive font-semibold text-text-muted hover:text-text">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {/*
          A hidden username field, as WHATWG and every major password manager
          recommend for a reset form. Without it a manager has no account to
          associate the new password with and will either skip the save prompt
          or save an orphaned entry. It stays empty because this page genuinely
          doesn't know the address — the token does.
        */}
        <input type="text" name="username" autoComplete="username" hidden readOnly value="" />

        <Field label="New password" required>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        {!passwordOk && <PasswordRules password={password} />}

        {resetPassword.error && (
          <Alert reference={errorReference(resetPassword.error)}>
            {authErrorMessage(
              resetPassword.error,
              'That link has expired or already been used. Request a new one.',
            )}
          </Alert>
        )}

        <Button type="submit" className="w-full" loading={resetPassword.isPending} disabled={!passwordOk}>
          Update password
        </Button>
      </form>
    </AuthCard>
  )
}
