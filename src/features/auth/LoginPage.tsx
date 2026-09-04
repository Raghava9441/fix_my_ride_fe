import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth/store'
import { ROUTE_PATHS } from '@/lib/routing'
import { Alert, Button, Field, PasswordInput, TextInput } from '@/components/ui'
import { AuthCard } from './components/AuthCard'
import { MfaChallengeForm } from './components/MfaChallengeForm'
import { errorReference, signInErrorMessage } from './authErrors'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const mfaChallenge = useAuthStore((s) => s.mfaChallenge)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  /*
   * Where to land after signing in. Comes from `?next=`, which the route
   * guard set when it bounced an unauthenticated request, so a deep link
   * survives the detour through login instead of dumping everyone on the
   * dashboard.
   *
   * In the query string rather than router state on purpose: it then
   * survives a page reload and can be shared. That makes validating it
   * mandatory — only same-origin absolute paths are honoured, since
   * following an arbitrary `next` would make this an open redirect.
   */
  const requested = searchParams.get('next')
  const next =
    requested?.startsWith('/') && !requested.startsWith('//') ? requested : ROUTE_PATHS.dashboard

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return // guards a double-submit from a fast second Enter
    setError(null)
    setSubmitting(true)
    try {
      const outcome = await login(email, password)
      /*
       * Only navigate once a session actually exists. An MFA challenge is a
       * *successful* password step that hasn't finished signing anyone in —
       * navigating on it sent the user to a guarded route with no session,
       * which bounced them straight back to this page.
       */
      if (outcome.kind === 'authenticated') navigate(next, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  // The challenge replaces the form rather than appearing beneath it: the
  // password step is done, and leaving its fields on screen invites someone
  // to retype a password that was already accepted.
  if (mfaChallenge) {
    return <MfaChallengeForm onVerified={() => navigate(next, { replace: true })} />
  }

  return (
    <AuthCard
      title="Sign in"
      description="Manage your vehicles, jobs, and service centers."
      footer={
        <>
          <Link
            to={ROUTE_PATHS.forgotPassword}
            className="interactive font-semibold text-text-muted hover:text-text"
          >
            Forgot password?
          </Link>
          <Link to={ROUTE_PATHS.register} className="interactive font-semibold text-accent">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" required>
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

        <Field label="Password" required>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        {error != null && (
          <Alert reference={errorReference(error)}>{signInErrorMessage(error)}</Alert>
        )}

        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  )
}
