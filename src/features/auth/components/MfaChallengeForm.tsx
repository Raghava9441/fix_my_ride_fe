import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuthStore } from '@/lib/auth/store'
import { Alert, Button, Field, TextInput } from '@/components/ui'
import { AuthCard } from './AuthCard'
import { authErrorMessage, errorReference } from '../authErrors'

/** The server issues 6-digit TOTP codes. */
const CODE_LENGTH = 6

/**
 * The second step of a sign-in: the TOTP code.
 *
 * Reached only when `POST /auth/login` answered with an MFA challenge, which
 * arrives as a 401 rather than a success body — see `lib/auth/store.ts`.
 * Before this screen existed that error was reported as "email or password is
 * incorrect", so nobody with 2FA enabled could sign in at all.
 *
 * ---- Input handling ----
 *
 * Codes are almost always pasted or autofilled from a password manager, and
 * typed one digit at a time otherwise. So: `inputMode="numeric"` for a phone
 * keypad, `autoComplete="one-time-code"` so iOS and Android offer the code
 * from the SMS/authenticator sheet, non-digits stripped on the way in (people
 * paste "123 456"), and auto-submit at six digits — asking someone to press a
 * button after typing the last digit of a code that can only be six digits
 * long is a step with no purpose.
 */
export function MfaChallengeForm({ onVerified }: { onVerified: () => void }) {
  const challenge = useAuthStore((s) => s.mfaChallenge)
  const verifyMfa = useAuthStore((s) => s.verifyMfa)
  const cancelMfa = useAuthStore((s) => s.cancelMfa)

  const [code, setCode] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on mount: the user has just submitted a password and the only
  // thing to do here is type six digits. Making them click first is friction
  // in the middle of a flow they're already committed to.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function submit(value: string) {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await verifyMfa(value)
      onVerified()
    } catch (err) {
      setError(err)
      // Clear and refocus so the next attempt is just typing, not
      // select-all-then-type over a rejected code.
      setCode('')
      inputRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits.length === CODE_LENGTH) void submit(digits)
  }

  // The store clears the challenge when it lapses; the guard on the parent
  // route will render the password form again.
  if (!challenge) return null

  return (
    <AuthCard
      title="Enter your code"
      description={
        <>
          Open your authenticator app and enter the {CODE_LENGTH}-digit code for{' '}
          <span className="font-medium text-text">{challenge.email}</span>.
        </>
      }
      footer={
        <button
          type="button"
          onClick={cancelMfa}
          className="interactive font-semibold text-text-muted hover:text-text"
        >
          Use a different account
        </button>
      }
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void submit(code)
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <Field label="Verification code" required>
          {(props) => (
            <TextInput
              {...props}
              ref={inputRef}
              // `text` not `number`: a number input strips leading zeros,
              // and a code beginning 0 is perfectly valid.
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CODE_LENGTH}
              required
              value={code}
              onChange={(e) => onChange(e.target.value)}
              className="text-center font-mono text-lg tracking-[0.4em]"
            />
          )}
        </Field>

        {error != null && (
          <Alert reference={errorReference(error)}>
            {authErrorMessage(error, 'That code didn’t work. Check your app and try again.')}
          </Alert>
        )}

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          disabled={code.length !== CODE_LENGTH}
        >
          Verify
        </Button>
      </form>
    </AuthCard>
  )
}
