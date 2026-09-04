import { Link } from 'react-router-dom'
import { Alert, Button } from '@/components/ui'
import { ROUTE_PATHS } from '@/lib/routing'
import { useAuthStore } from '@/lib/auth/store'
import { useResendVerification } from '@/features/auth/api'
import { useOnboardingStatus } from '@/features/onboarding/api'

/**
 * Tells a user why part of the app isn't working for them yet.
 *
 * Two states reach the workspace in a half-enabled condition, and both are
 * created by flows that succeed:
 *
 *   - **`pending_verification`** — `POST /auth/register` issues tokens
 *     immediately, so a new user is signed in before they have clicked
 *     anything in their inbox. Without this banner the only mention of
 *     verification is one line on a signup form they have already left.
 *   - **A tenant awaiting review** — `POST /onboarding/signup` does the same,
 *     into an organisation an administrator has not approved. This is the
 *     *only* way to be inside the app with a pending tenant: `login()` refuses
 *     to issue tokens for one at all (`AUTH_014`), so an applicant who signs
 *     out cannot get back in until it is approved. Saying so here is the
 *     difference between a considered queue and an app that appears to have
 *     locked them out at random.
 *
 * Rendered above the content region rather than as a toast: neither is
 * transient, and both stay true until something outside the app changes.
 *
 * Nothing is shown while the queries are still resolving. A banner that
 * appears a beat after the page and pushes everything down is worse than one
 * that arrives with it.
 */
export function AccountStatusBanner() {
  const accountStatus = useAuthStore((s) => s.user?.status)
  const email = useAuthStore((s) => s.user?.email)
  const onboarding = useOnboardingStatus()
  const resend = useResendVerification()

  const needsVerification = accountStatus === 'pending_verification'
  const review = onboarding.data

  if (review?.onboardingStatus === 'rejected') {
    return (
      <Alert tone="critical" title="Your organisation's application wasn't approved">
        {review.rejectionReason || 'Contact support if you think this was a mistake.'}
      </Alert>
    )
  }

  if (review?.onboardingStatus === 'pending_review') {
    return (
      <Alert tone="warning" title="Your organisation is awaiting review">
        {review.organizationName} is being reviewed. Some features stay locked until it's approved — we'll
        email you when that's done.
      </Alert>
    )
  }

  if (!needsVerification) return null

  return (
    <Alert
      tone="warning"
      title="Verify your email address"
      action={
        resend.isSuccess ? (
          <span className="text-xs font-medium text-success">
            Sent — check {email} for the link.
          </span>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              loading={resend.isPending}
              onClick={() => email && resend.mutate(email)}
            >
              Resend link
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to={ROUTE_PATHS.verifyEmail}>I have a link</Link>
            </Button>
          </>
        )
      }
    >
      We sent a verification link to <span className="font-medium text-text">{email}</span>. Some actions
      stay unavailable until you use it.
    </Alert>
  )
}
