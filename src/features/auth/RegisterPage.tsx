import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, Field, PasswordInput, PasswordRules, TextInput } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'
import { isPasswordAcceptable } from '@/lib/auth/passwordPolicy'
import { useRegister } from './api'
import { AuthCard } from './components/AuthCard'
import { authErrorMessage, errorReference, serverFieldErrors } from './authErrors'

/**
 * Self-serve signup for an individual vehicle owner.
 *
 * `POST /auth/register` creates an `owner` account with no tenant and
 * **returns a token pair** — so this signs the user in rather than parking
 * them on a "check your email" screen. The account lands in
 * `pending_verification`; that is surfaced by the banner in the app shell,
 * not by blocking them here, because an unverified account is still usable.
 *
 * Creating a *workspace* is a different endpoint with different fields —
 * `POST /onboarding/signup` — and is linked from the footer rather than
 * folded in behind a toggle. The two collect different information and one
 * needs approval; a single form branching on a checkbox would hide that.
 *
 * ---- No "confirm password" field ----
 *
 * Deliberate. It doubles the typing, cannot catch a mistake made identically
 * twice, and is a leading cause of mobile signup abandonment. The reveal
 * toggle on `PasswordInput` solves the actual problem — letting someone check
 * what they typed — and the live rule checklist means they learn about a
 * policy violation while typing rather than after a rejected submit.
 */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const register = useRegister()

  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [touched, setTouched] = useState(false)

  /*
   * Honours `?next=` the same way sign-in does, and validated the same way —
   * only same-origin absolute paths, or this becomes an open redirect.
   *
   * It matters here because registration is a step *inside* other flows, not
   * only an entry point: the invitation screen sends people who have no
   * account through this form and expects them back. Dropping `next` would
   * land a new user on the dashboard having silently abandoned the
   * invitation they were part-way through accepting.
   */
  const requested = searchParams.get('next')
  const next =
    requested?.startsWith('/') && !requested.startsWith('//') ? requested : ROUTE_PATHS.dashboard

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }))

  // Server field errors take precedence over anything computed here: they
  // reflect a rule this form doesn't know (a duplicate email), so a passing
  // client check must not overwrite the actual reason it failed.
  const fieldErrors = new Map(
    serverFieldErrors(register.error).map(({ field, message }) => [field ?? '', message]),
  )

  const passwordOk = isPasswordAcceptable(values.password)
  const canSubmit =
    values.firstName.trim() !== '' &&
    values.lastName.trim() !== '' &&
    values.email.trim() !== '' &&
    passwordOk

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit || register.isPending) return

    try {
      await register.mutateAsync({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
      })
      // `useRegister` adopts the session in its own onSuccess, so by here a
      // session exists and the destination's guard will admit us.
      navigate(next, { replace: true })
    } catch {
      // Rendered from `register.error` below; mutateAsync rejects as well as
      // storing it, and an unhandled rejection here would be reported as a
      // crash rather than a form error.
    }
  }

  return (
    <AuthCard
      title="Create account"
      description="Track your vehicles, service history, and reminders in one place."
      footer={
        <>
          <Link to={ROUTE_PATHS.login} className="interactive font-semibold text-text-muted hover:text-text">
            Already have an account?
          </Link>
          <Link to={ROUTE_PATHS.onboarding} className="interactive font-semibold text-accent">
            Register a business
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required error={touched ? fieldErrors.get('firstName') : undefined}>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="given-name"
                required
                value={values.firstName}
                onChange={set('firstName')}
              />
            )}
          </Field>
          <Field label="Last name" required error={touched ? fieldErrors.get('lastName') : undefined}>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="family-name"
                required
                value={values.lastName}
                onChange={set('lastName')}
              />
            )}
          </Field>
        </div>

        <Field label="Email" required error={fieldErrors.get('email')}>
          {(props) => (
            <TextInput
              {...props}
              type="email"
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={values.email}
              onChange={set('email')}
            />
          )}
        </Field>

        <Field label="Password" required error={fieldErrors.get('password')}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              required
              value={values.password}
              onChange={set('password')}
            />
          )}
        </Field>

        {/* Hidden once satisfied — a checklist of four green ticks is noise
            once there's nothing left to do. */}
        {!passwordOk && <PasswordRules password={values.password} />}

        {register.error && !fieldErrors.size && (
          <Alert reference={errorReference(register.error)}>
            {authErrorMessage(register.error, 'Couldn’t create your account. Try again.')}
          </Alert>
        )}

        <Button type="submit" className="w-full" loading={register.isPending}>
          Create account
        </Button>

        <p className="text-center text-xs text-text-faint">
          We’ll email you a link to verify your address.
        </p>
      </form>
    </AuthCard>
  )
}
