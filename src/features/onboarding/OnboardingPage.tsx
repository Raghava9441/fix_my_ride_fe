import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Field, PasswordInput, PasswordRules, TextInput } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'
import { useAuthStore } from '@/lib/auth/store'
import { isPasswordAcceptable } from '@/lib/auth/passwordPolicy'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { authErrorMessage, errorReference, serverFieldErrors } from '@/features/auth/authErrors'
import { useSignupOrganization } from './api'

/**
 * Registers a business and its first administrator.
 *
 * Distinct from `/register`, which creates an individual vehicle owner. This
 * hits `POST /onboarding/signup`, creates a tenant as well as an account, and
 * lands in a **pending review** state — so the confirmation has to say so
 * rather than dropping someone into a workspace that isn't approved yet.
 *
 * ---- Two steps, not one ----
 *
 * The endpoint's schema requires eight fields. As a single column that is a
 * wall of inputs, and the two halves are genuinely different subjects: who
 * you are, then what the business is. Splitting them also means the password
 * rules aren't competing for attention with a registration number.
 *
 * Step one is validated locally before step two is reachable, so nobody fills
 * in six fields of business detail and then discovers their password was
 * rejected.
 */
export default function OnboardingPage() {
  const navigate = useNavigate()
  const signup = useSignupOrganization()
  const adoptSession = useAuthStore((s) => s.adoptSession)

  const [step, setStep] = useState<1 | 2>(1)
  const [submitted, setSubmitted] = useState(false)
  const [values, setValues] = useState({
    ownerFirstName: '',
    ownerLastName: '',
    email: '',
    password: '',
    organizationName: '',
    contactPhone: '',
    businessRegistrationNumber: '',
    city: '',
    serviceCenterName: '',
  })

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }))

  const fieldErrors = new Map(
    serverFieldErrors(signup.error).map(({ field, message }) => [field ?? '', message]),
  )

  const passwordOk = isPasswordAcceptable(values.password)
  const stepOneComplete =
    values.ownerFirstName.trim() !== '' &&
    values.ownerLastName.trim() !== '' &&
    values.email.trim() !== '' &&
    passwordOk
  const stepTwoComplete =
    values.organizationName.trim() !== '' &&
    values.contactPhone.trim() !== '' &&
    values.businessRegistrationNumber.trim() !== '' &&
    values.city.trim() !== ''

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!stepOneComplete || !stepTwoComplete || signup.isPending) return

    try {
      const result = await signup.mutateAsync({
        ownerFirstName: values.ownerFirstName.trim(),
        ownerLastName: values.ownerLastName.trim(),
        email: values.email.trim(),
        password: values.password,
        organizationName: values.organizationName.trim(),
        contactPhone: values.contactPhone.trim(),
        businessRegistrationNumber: values.businessRegistrationNumber.trim(),
        city: values.city.trim(),
        // Sent only when filled: the schema marks it optional, and an empty
        // string would fail its `min(1)` rather than being read as absent.
        serviceCenterName: values.serviceCenterName.trim() || undefined,
      })

      /*
       * Signup returns tokens, so the applicant *is* signed in — into an
       * organisation awaiting review. The confirmation is shown first rather
       * than navigating straight through: landing someone in a workspace
       * without explaining that it's pending approval makes the empty state
       * look broken.
       */
      await adoptSession(result)
      setSubmitted(true)
    } catch {
      // Surfaced from `signup.error` below.
    }
  }

  if (submitted) {
    return (
      <AuthCard title="Application submitted" size="md">
        <Alert tone="success" title="We’re reviewing your organisation">
          Your account is ready and you can sign in now, but some features stay locked until{' '}
          <span className="font-medium text-text">{values.organizationName}</span> is approved. We’ll email{' '}
          <span className="font-medium text-text">{values.email}</span> when that’s done — check that inbox
          for a verification link in the meantime.
        </Alert>
        <Button className="w-full" onClick={() => navigate(ROUTE_PATHS.dashboard, { replace: true })}>
          Go to dashboard
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Register your business"
      description={
        step === 1
          ? 'Step 1 of 2 — the administrator account.'
          : 'Step 2 of 2 — about the business.'
      }
      size="md"
      footer={
        <>
          <Link to={ROUTE_PATHS.login} className="interactive font-semibold text-text-muted hover:text-text">
            Already have an account?
          </Link>
          <Link to={ROUTE_PATHS.register} className="interactive font-semibold text-accent">
            Sign up as a vehicle owner
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {/*
          Both steps stay mounted, with the inactive one hidden. Unmounting
          would discard what was typed on step one the moment someone goes
          back to correct a typo — and `hidden` keeps those fields out of the
          tab order and the accessibility tree for free.
        */}
        <div hidden={step !== 1} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name" required error={fieldErrors.get('ownerFirstName')}>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="given-name"
                  value={values.ownerFirstName}
                  onChange={set('ownerFirstName')}
                />
              )}
            </Field>
            <Field label="Last name" required error={fieldErrors.get('ownerLastName')}>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="family-name"
                  value={values.ownerLastName}
                  onChange={set('ownerLastName')}
                />
              )}
            </Field>
          </div>

          <Field label="Work email" required error={fieldErrors.get('email')}>
            {(props) => (
              <TextInput
                {...props}
                type="email"
                autoComplete="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
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
                value={values.password}
                onChange={set('password')}
              />
            )}
          </Field>

          {!passwordOk && <PasswordRules password={values.password} />}

          <Button type="button" className="w-full" disabled={!stepOneComplete} onClick={() => setStep(2)}>
            Continue
          </Button>
        </div>

        <div hidden={step !== 2} className="flex flex-col gap-4">
          <Field label="Organisation name" required error={fieldErrors.get('organizationName')}>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="organization"
                value={values.organizationName}
                onChange={set('organizationName')}
              />
            )}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Contact phone" required error={fieldErrors.get('contactPhone')}>
              {(props) => (
                <TextInput
                  {...props}
                  type="tel"
                  autoComplete="tel"
                  value={values.contactPhone}
                  onChange={set('contactPhone')}
                />
              )}
            </Field>
            <Field label="City" required error={fieldErrors.get('city')}>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="address-level2"
                  value={values.city}
                  onChange={set('city')}
                />
              )}
            </Field>
          </div>

          <Field
            label="Business registration number"
            required
            hint="Used to verify the business during review."
            error={fieldErrors.get('businessRegistrationNumber')}
          >
            {(props) => (
              <TextInput
                {...props}
                value={values.businessRegistrationNumber}
                onChange={set('businessRegistrationNumber')}
              />
            )}
          </Field>

          <Field
            label="First service center"
            hint="Optional — you can add centers later."
            error={fieldErrors.get('serviceCenterName')}
          >
            {(props) => (
              <TextInput
                {...props}
                value={values.serviceCenterName}
                onChange={set('serviceCenterName')}
              />
            )}
          </Field>

          {signup.error && (
            <Alert reference={errorReference(signup.error)}>
              {authErrorMessage(signup.error, 'Couldn’t submit your application. Try again.')}
            </Alert>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={signup.isPending}
              disabled={!stepTwoComplete}
            >
              Submit application
            </Button>
          </div>
        </div>
      </form>
    </AuthCard>
  )
}
