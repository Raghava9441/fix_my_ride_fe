import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui'
import { LockIcon } from '@/components/icons'
import type { Account } from '@/features/accounts/types'

/**
 * Recent sign-in attempts.
 *
 * Genuinely useful rather than decorative: the failed attempts are how
 * somebody notices an account is being probed, which is why they're shown
 * alongside the successful ones rather than filtered out. Newest first, and
 * capped — this is a glance, not an audit log; that lives under Audit.
 */
export function SignInHistory({ account }: { account?: Account }) {
  const history = [...(account?.loginHistory ?? [])]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6)

  return (
    <Card>
      <CardHeader title="Recent sign-ins" description="Check for anything you don’t recognise." />
      <CardBody className="p-0">
        {history.length === 0 ? (
          <EmptyState
            icon={LockIcon}
            size="sm"
            title="No sign-in history"
            description="Activity appears here after your next sign-in."
          />
        ) : (
          <ul>
            {history.map((entry, index) => (
              <li
                key={`${entry.timestamp}-${index}`}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {new Date(entry.timestamp).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {entry.location || 'Unknown location'}
                    {entry.ipAddress && ` · ${entry.ipAddress}`}
                  </div>
                </div>

                {/* Text as well as colour — a red dot alone doesn't say
                    "failed" to a screen reader or in greyscale. */}
                <Badge tone={entry.successful ? 'success' : 'critical'}>
                  {entry.successful ? 'Success' : 'Failed'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
