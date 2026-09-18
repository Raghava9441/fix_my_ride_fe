import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  PasswordInput,
  PasswordRules,
  useToast,
} from '@/components/ui'
import { isPasswordAcceptable, passwordPolicyError } from '@/lib/auth/passwordPolicy'
import { authErrorMessage, errorReference, serverFieldErrors } from '@/features/auth/authErrors'
import { useChangePassword } from '@/features/auth/api'

/**
 * Password change for a signed-in user.
 *
 * Separate from the reset flow: that one proves identity with an emailed
 * token and has no current password to offer, this one proves it with the
 * existing password. They share the policy helpers, the live rule list, and
 * the deliberate absence of a "confirm password" field — see
 * `PasswordInput`, which solves that with a reveal toggle instead.
 */
export function ChangePasswordCard() {
  const toast = useToast()
  const changePassword = useChangePassword()

  const [values, setValues] = useState({ current: '', next: '' })
  const [submitted, setSubmitted] = useState(false)

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }))

  const policyError = values.next ? passwordPolicyError(values.next) : undefined

  // The new password must differ from the current one. The API rejects this
  // as well, but catching it here saves a round trip that comes back as a
  // validation error the user has to scroll up and re-read.
  const unchanged = values.next.length > 0 && values.next === values.current

  const canSubmit =
    values.current.length > 0 &&
    isPasswordAcceptable(values.next) &&
    !unchanged &&
    !changePassword.isPending

  const fieldErrors = serverFieldErrors(changePassword.error)
  const serverFieldError = (name: string) =>
    fieldErrors.find((entry) => entry.field === name)?.message

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (!canSubmit) return

    changePassword.mutate(
      { currentPassword: values.current, newPassword: values.next },
      {
        onSuccess: () => {
          // Cleared on success so the form isn't left holding two live
          // credentials in component state for the rest of the session.
          setValues({ current: '', next: '' })
          setSubmitted(false)
          toast.success('Password changed', 'Use your new password next time you sign in.')
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader title="Password" description="Change the password you use to sign in." />
      <CardBody>
        <form className="flex max-w-md flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {changePassword.error ? (
            <Alert tone="critical" reference={errorReference(changePassword.error)}>
              {authErrorMessage(changePassword.error, 'Could not change your password.')}
            </Alert>
          ) : null}

          <Field
            label="Current password"
            required
            error={submitted ? serverFieldError('currentPassword') : undefined}
          >
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="current-password"
                value={values.current}
                onChange={set('current')}
              />
            )}
          </Field>

          <Field
            label="New password"
            required
            error={
              submitted
                ? (unchanged ? 'Choose a password different from your current one.' : policyError) ??
                  serverFieldError('newPassword')
                : undefined
            }
          >
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                value={values.next}
                onChange={set('next')}
              />
            )}
          </Field>

          <PasswordRules password={values.next} />

          <div>
            <Button type="submit" disabled={!canSubmit} loading={changePassword.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
