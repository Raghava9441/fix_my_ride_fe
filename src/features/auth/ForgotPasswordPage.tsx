import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Field, TextInput } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'
import { useForgotPassword } from './api'
import { AuthCard } from './components/AuthCard'
import { authErrorMessage, errorReference } from './authErrors'

/**
 * Requests a password-reset email.
 *
 * ---- The confirmation is deliberately uninformative ----
 *
 * `POST /auth/forgot-password` answers 200 whether or not an account exists,
 * specifically so it can't be used to test which email addresses are
 * registered. This screen has to hold that line: it says "if an account
 * exists, we've sent a link" and never "we've sent you a link", because the
 * second sentence confirms the address is real and hands back exactly the
 * oracle the endpoint was written to deny.
 *
 * That means the success state is the same for a typo'd address as for a real
 * one, which is why it also tells the user to check the address and offers a
 * way back to change it.
 */
export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const [email, setEmail] = useState('')
  const submittedTo = forgotPassword.isSuccess ? forgotPassword.variables : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (forgotPassword.isPending) return
    try {
      await forgotPassword.mutateAsync(email.trim())
    } catch {
      // Surfaced from `forgotPassword.error` below.
    }
  }

  if (submittedTo) {
    return (
      <AuthCard
        title="Check your email"
        footer={
          <Link to={ROUTE_PATHS.login} className="interactive font-semibold text-text-muted hover:text-text">
            Back to sign in
          </Link>
        }
      >
        <Alert tone="success" title="Request received">
          If an account exists for <span className="font-medium text-text">{submittedTo}</span>, we’ve sent
          it a link to choose a new password. The link is valid for a limited time.
        </Alert>

        <p className="text-xs text-text-faint">
          Nothing arrived after a few minutes? Check the spam folder, and confirm the address above is the
          one on the account.
        </p>

        <Button variant="secondary" className="w-full" onClick={() => forgotPassword.reset()}>
          Use a different address
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset password"
      description="Enter the email on your account and we’ll send you a link to choose a new password."
      footer={
        <Link to={ROUTE_PATHS.login} className="interactive font-semibold text-text-muted hover:text-text">
          Back to sign in
        </Link>
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

        {forgotPassword.error && (
          <Alert reference={errorReference(forgotPassword.error)}>
            {authErrorMessage(forgotPassword.error, 'Couldn’t send the email. Try again.')}
          </Alert>
        )}

        <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  )
}
