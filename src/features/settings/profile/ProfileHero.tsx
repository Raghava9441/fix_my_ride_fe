import { Avatar, Badge } from '@/components/ui'
import { CheckIcon } from '@/components/icons'
import { ACCOUNT_ROLE_LABELS, type AccountRole } from '@/lib/access/roles'
import type { Account } from '@/features/accounts/types'

interface ProfileHeroProps {
  account?: Account
  displayName: string
  loading?: boolean
}

/**
 * The identity banner at the top of the profile.
 *
 * The accent wash is the one piece of pure decoration on this screen, and it
 * earns its place: a settings area is otherwise a wall of identical cards, and
 * a single anchored surface at the top tells you at a glance whose account you
 * are looking at. It's built from the accent token, so it follows the user's
 * chosen colour rather than hard-coding a brand gradient.
 */
export function ProfileHero({ account, displayName, loading }: ProfileHeroProps) {
  const memberSince = account?.createdAt
    ? new Date(account.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : undefined

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-surface-raised">
      {/* Decorative only — well below text contrast, and `aria-hidden`. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background:
            'linear-gradient(135deg, var(--accent-bg) 0%, transparent 55%), linear-gradient(45deg, transparent 60%, var(--accent-bg) 100%)',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-5">
        {loading ? (
          <div className="skeleton h-16 w-16 flex-none rounded-full" />
        ) : (
          <Avatar name={displayName} size="lg" className="!h-16 !w-16 !text-lg ring-4 ring-surface-raised" />
        )}

        <div className="min-w-0 flex-1">
          {loading ? (
            <>
              <div className="skeleton h-6 w-44" />
              <div className="skeleton mt-2 h-4 w-56" />
            </>
          ) : (
            <>
              <h2 className="truncate text-xl leading-tight">{displayName}</h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
                <span className="truncate">{account?.email}</span>
                {account?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <CheckIcon className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-warning">Unverified</span>
                )}
              </div>

              {memberSince && (
                <p className="mt-1 text-xs text-text-faint">Member since {memberSince}</p>
              )}
            </>
          )}
        </div>

        {!loading && account && (
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <Badge tone="accent">
              {ACCOUNT_ROLE_LABELS[account.primaryRole as AccountRole] ?? account.primaryRole}
            </Badge>
            {/* Status only when it isn't the unremarkable case — a green
                "active" pill on every account is noise. */}
            {account.status && account.status !== 'active' && (
              <Badge tone={account.status === 'suspended' ? 'critical' : 'warning'}>
                {account.status.replace(/_/g, ' ')}
              </Badge>
            )}
            {account.mfaEnabled && <Badge tone="success">2FA on</Badge>}
          </div>
        )}
      </div>
    </div>
  )
}
