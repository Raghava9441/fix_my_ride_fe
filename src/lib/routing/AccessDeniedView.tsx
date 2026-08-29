import { Link } from 'react-router-dom'
import { LockIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { useAccess } from '../access/AccessProvider'
import type { AccessDecision } from '../access/policy'
import { ROUTE_PATHS } from './paths'

type Denied = Extract<AccessDecision, { allowed: false }>

/**
 * Rendered in place of a screen the current principal may not open.
 *
 * Says *why*, using the denial detail the policy evaluator produced. A bare
 * "403 Forbidden" leaves the user with nothing to act on; naming the missing
 * permission or role tells them what to ask their admin for — and tells us
 * something useful when it turns up in a support ticket.
 *
 * A `flag-disabled` denial is worded differently on purpose: nothing is
 * wrong with the account, the feature simply isn't switched on.
 */
export function AccessDeniedView({ decision }: { decision: Denied }) {
  const { session, capabilities } = useAccess()
  const isFlag = decision.reason === 'flag-disabled'

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-card bg-warning-bg text-warning">
          <LockIcon className="h-5 w-5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl">{isFlag ? 'Not available yet' : 'You don’t have access to this'}</h1>
          <p className="text-sm text-text-muted">{decision.detail}</p>
        </div>

        {session && !isFlag && (
          <p className="text-xs text-text-faint">
            Signed in as {session.email} · {session.primaryRole.replace(/_/g, ' ')}
            {capabilities.tenantId ? ' · workspace member' : ''}
          </p>
        )}

        <div className="mt-1 flex gap-2">
          <Button asChild variant="secondary">
            <Link to={ROUTE_PATHS.dashboard}>Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
