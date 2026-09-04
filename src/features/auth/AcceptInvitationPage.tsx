import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, DescriptionList, Spinner } from '@/components/ui'
import { ROUTE_PATHS, to } from '@/lib/routing'
import { useAuthStore } from '@/lib/auth/store'
import { useAcceptInvitation, useValidateInvitation } from '@/features/invitations/api'
import { AuthCard } from './components/AuthCard'
import { authErrorMessage, errorReference } from './authErrors'

const TYPE_LABELS: Record<string, string> = {
  vehicle_access: 'Access to a vehicle',
  center_staff: 'Join a service center team',
  ownership_transfer: 'Transfer of vehicle ownership',
  collaborator: 'Collaborate on a workspace',
}

/**
 * Accepts an invitation from an emailed link.
 *
 * ---- Why this screen has a signed-out branch ----
 *
 * The two endpoints have different access rules, and the flow falls out of
 * that: `GET /invitations/validate` is public, while `POST
 * /invitations/:id/accept` sits behind `authenticate`. So an invitee arriving
 * signed out *can* be shown what they were invited to, but cannot accept it
 * until they have an account.
 *
 * That ordering is deliberate on the server's part and worth preserving
 * rather than working around: accepting an invitation binds it to a specific
 * account, so there has to be an account first. What this screen adds is that
 * the user sees the invitation *before* being asked to sign up — being sent
 * to a bare registration form with no explanation of why is how invitations
 * get abandoned.
 *
 * The token is carried through the sign-in detour in `?next=`, so accepting
 * resumes here automatically afterwards.
 */
export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? undefined

  const session = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const preview = useValidateInvitation(token)
  const accept = useAcceptInvitation()

  if (!token) {
    return (
      <AuthCard title="Link isn’t valid">
        <Alert tone="warning" title="Something's missing from this link">
          It may have been truncated by your email client. Open it directly from the invitation email.
        </Alert>
        <Button asChild variant="secondary" className="w-full">
          <Link to={ROUTE_PATHS.login}>Go to sign in</Link>
        </Button>
      </AuthCard>
    )
  }

  // Wait for the session to resolve before branching on it. Rendering the
  // signed-out call to action while a refresh is still in flight would tell a
  // signed-in user to sign in, then swap under them a moment later.
  if (preview.isPending || status === 'idle' || status === 'loading') {
    return (
      <AuthCard title="Checking your invitation">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <Spinner className="h-4 w-4" />
          <span>Just a moment…</span>
        </div>
      </AuthCard>
    )
  }

  if (preview.isError) {
    return (
      <AuthCard title="Invitation not found">
        <Alert reference={errorReference(preview.error)}>
          {authErrorMessage(
            preview.error,
            'We couldn’t find this invitation. It may have been withdrawn, or the link may be incomplete.',
          )}
        </Alert>
        <Button asChild variant="secondary" className="w-full">
          <Link to={ROUTE_PATHS.login}>Go to sign in</Link>
        </Button>
      </AuthCard>
    )
  }

  const { valid, invitation } = preview.data
  const inviter = invitation.inviterName ?? 'Someone'

  /*
   * `valid` rather than `status === 'pending'`: it comes from the model's own
   * `isValid()`, which also accounts for expiry and the use count. A status of
   * "pending" on an invitation that expired yesterday would otherwise render
   * an accept button that always fails.
   */
  if (!valid) {
    return (
      <AuthCard title="This invitation has expired">
        <Alert tone="warning">
          Invitations are valid for a limited time and can only be used once. Ask {inviter} to send a new
          one.
        </Alert>
        <Button asChild variant="secondary" className="w-full">
          <Link to={ROUTE_PATHS.login}>Go to sign in</Link>
        </Button>
      </AuthCard>
    )
  }

  if (accept.isSuccess) {
    return (
      <AuthCard title="Invitation accepted">
        <Alert tone="success">You now have access. Everything it covers is in your workspace.</Alert>
        <Button className="w-full" onClick={() => navigate(ROUTE_PATHS.dashboard, { replace: true })}>
          Go to dashboard
        </Button>
      </AuthCard>
    )
  }

  const details = (
    <DescriptionList
      items={[
        { label: 'From', value: inviter },
        { label: 'Invitation', value: TYPE_LABELS[invitation.invitationType] ?? invitation.invitationType },
        { label: 'Role', value: <Badge tone="neutral">{invitation.role}</Badge> },
        { label: 'Access', value: invitation.accessLevel },
      ]}
    />
  )

  // Signed out: show the invitation, then send them to sign in or register
  // with a `next` that returns them here — including the token, so the second
  // visit resumes rather than restarting.
  if (!session) {
    const returnTo = `${ROUTE_PATHS.acceptInvitation}?token=${encodeURIComponent(token)}`

    return (
      <AuthCard
        title={`${inviter} invited you`}
        description={invitation.message || 'Sign in or create an account to accept.'}
      >
        {details}

        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link to={to.loginWithReturn(returnTo)}>Sign in to accept</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link to={`${ROUTE_PATHS.register}?next=${encodeURIComponent(returnTo)}`}>
              Create an account
            </Link>
          </Button>
        </div>

        {invitation.inviteeEmail && (
          <p className="text-xs text-text-faint">
            This invitation was sent to{' '}
            <span className="font-medium text-text-muted">{invitation.inviteeEmail}</span>. Use that address
            so it can be matched to your account.
          </p>
        )}
      </AuthCard>
    )
  }

  /*
   * Signed in as somebody the invitation wasn't addressed to. Not blocked —
   * the server decides, and there are legitimate cases (an alias, a shared
   * mailbox) — but called out, because silently accepting onto the wrong
   * account is tedious to undo and the user is the only one who can tell.
   */
  const addressedToSomeoneElse =
    invitation.inviteeEmail != null &&
    invitation.inviteeEmail.toLowerCase() !== session.email.toLowerCase()

  return (
    <AuthCard
      title={`${inviter} invited you`}
      description={invitation.message || undefined}
    >
      {details}

      {addressedToSomeoneElse && (
        <Alert tone="warning" title="Signed in as a different account">
          This invitation was sent to{' '}
          <span className="font-medium text-text">{invitation.inviteeEmail}</span>, but you’re signed in as{' '}
          <span className="font-medium text-text">{session.email}</span>. Accepting will attach it to the
          account you’re using now.
        </Alert>
      )}

      {accept.error && (
        <Alert reference={errorReference(accept.error)}>
          {authErrorMessage(accept.error, 'Couldn’t accept this invitation. Try again.')}
        </Alert>
      )}

      <Button
        className="w-full"
        loading={accept.isPending}
        onClick={() => accept.mutate(invitation._id)}
      >
        Accept invitation
      </Button>
    </AuthCard>
  )
}
