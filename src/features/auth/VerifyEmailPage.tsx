import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Field, Spinner, TextInput } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'
import { useAuthStore } from '@/lib/auth/store'
import { useResendVerification, useVerifyEmail } from './api'
import { AuthCard } from './components/AuthCard'
import { authErrorMessage, errorReference } from './authErrors'

/**
 * Completes email verification from an emailed link.
 *
 * Runs on mount from the `?token=` in the URL — there is nothing to ask the
 * user, and a "click here to verify" button on a page they reached *by
 * clicking a link to verify* is a step that exists only to be clicked.
 *
 * Public rather than anonymous-only: a signed-in user following their own
 * verification link is the common case, not an error.
 *
 * ---- Failure is the interesting state ----
 *
 * Tokens expire after 24 hours, and the most likely visitor to this screen
 * with a bad token is someone whose link sat in an inbox over a weekend. So
 * the failure branch isn't a dead end — it offers a resend, which is the only
 * thing that actually helps. The email is prefilled from the session when
 * there is one, and asked for when there isn't.
 */
export default function VerifyEmailPage() {
  /*
   * Read through the router, not `window.location.search`.
   *
   * A direct read isn't reactive: it happens once during render and never
   * re-subscribes, so any client-side navigation to this route — the
   * "I have a link" action in the app shell's verification banner, or a
   * back/forward step — renders against a stale query string and shows the
   * "link isn't valid" branch for a link that has a perfectly good token.
   */
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? undefined
  const verification = useVerifyEmail(token)
  const sessionEmail = useAuthStore((s) => s.user?.email)
  const refreshSession = useAuthStore((s) => s.refreshSession)
  const resend = useResendVerification()

  const [email, setEmail] = useState(sessionEmail ?? '')

  async function onResend(e: FormEvent) {
    e.preventDefault()
    if (resend.isPending) return
    try {
      await resend.mutateAsync(email.trim())
    } catch {
      // Surfaced from `resend.error` below.
    }
  }

  if (!token) {
    return (
      <AuthCard title="Link isn’t valid">
        <Alert tone="warning" title="Something's missing from this link">
          It may have been truncated by your email client. Open it directly from the email, or request a new
          one below.
        </Alert>
        <ResendForm
          email={email}
          setEmail={setEmail}
          onSubmit={onResend}
          pending={resend.isPending}
          sent={resend.isSuccess}
          error={resend.error}
        />
      </AuthCard>
    )
  }

  if (verification.isPending) {
    return (
      <AuthCard title="Verifying your email">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <Spinner className="h-4 w-4" />
          <span>Just a moment…</span>
        </div>
      </AuthCard>
    )
  }

  if (verification.isSuccess) {
    return (
      <AuthCard title="Email verified">
        <Alert tone="success">Your email address is confirmed. You’re all set.</Alert>
        <Button
          asChild
          className="w-full"
          // The account's `status` changed server-side, and the session in
          // memory still says `pending_verification` — re-read it so the
          // banner in the app shell doesn't keep asking for something that's
          // already done.
          onClick={() => void refreshSession()}
        >
          <Link to={sessionEmail ? ROUTE_PATHS.dashboard : ROUTE_PATHS.login}>
            {sessionEmail ? 'Go to dashboard' : 'Go to sign in'}
          </Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Couldn’t verify that link">
      <Alert reference={errorReference(verification.error)}>
        {authErrorMessage(
          verification.error,
          'This link has expired or has already been used. Request a new one below.',
        )}
      </Alert>
      <ResendForm
        email={email}
        setEmail={setEmail}
        onSubmit={onResend}
        pending={resend.isPending}
        sent={resend.isSuccess}
        error={resend.error}
      />
    </AuthCard>
  )
}

function ResendForm({
  email,
  setEmail,
  onSubmit,
  pending,
  sent,
  error,
}: {
  email: string
  setEmail: (value: string) => void
  onSubmit: (e: FormEvent) => void
  pending: boolean
  sent: boolean
  error: unknown
}) {
  if (sent) {
    // Same anti-enumeration wording as the password reset flow: the endpoint
    // answers identically whether or not the address is registered, and this
    // sentence must not say more than the endpoint does.
    return (
      <Alert tone="success" title="Request received">
        If that address needs verifying, a new link is on its way.
      </Alert>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Email" required hint="We’ll send a fresh verification link.">
        {(props) => (
          <TextInput
            {...props}
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>

      {error != null && (
        <Alert reference={errorReference(error)}>
          {authErrorMessage(error, 'Couldn’t send the email. Try again.')}
        </Alert>
      )}

      <Button type="submit" variant="secondary" className="w-full" loading={pending}>
        Send a new link
      </Button>
    </form>
  )
}
