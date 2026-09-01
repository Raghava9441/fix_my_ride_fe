import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth/store'
import { ApiError } from '@/lib/api/errors'
import { ROUTE_PATHS } from '@/lib/routing'
import { Button, Card, CardBody, Field, TextInput } from '@/components/ui'

/**
 * Turns a sign-in failure into something the user can act on.
 *
 * Deliberately not `ApiError.userMessage` for the auth kinds: that wording
 * ("your session has expired") is right when a token lapses mid-session and
 * wrong on a login form, where there was no session to expire. Everything
 * else — network, timeout, rate limit, 5xx — already has the right sentence
 * there, so it falls through.
 */
function messageForLoginFailure(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.'

  if (err.kind === 'unauthenticated' || err.kind === 'validation') {
    // Intentionally does not distinguish "no such account" from "wrong
    // password" — that difference lets an attacker enumerate valid emails.
    return 'Email or password is incorrect.'
  }

  return err.userMessage
}

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const mfaPending = useAuthStore((s) => s.mfaPending)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
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
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(messageForLoginFailure(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardBody className="p-7">
        <h1 className="text-xl">Sign in</h1>
        <p className="mt-1 text-sm text-text-muted">Manage your vehicles, jobs, and service centers.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Email" required>
            {(props) => (
              <TextInput
                {...props}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>

          <Field label="Password" required>
            {(props) => (
              <TextInput
                {...props}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          {mfaPending && (
            <p className="text-sm font-medium text-warning">
              This account uses two-factor authentication. The verification step isn’t built in this client yet.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-critical">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <Link to={ROUTE_PATHS.forgotPassword} className="interactive font-semibold text-text-muted hover:text-text">
            Forgot password?
          </Link>
          <Link to={ROUTE_PATHS.register} className="interactive font-semibold text-accent">
            Create an account
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
