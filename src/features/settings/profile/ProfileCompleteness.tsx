import { Card, CardBody } from '@/components/ui'
import { CheckIcon } from '@/components/icons'
import type { Account } from '@/features/accounts/types'
import type { OwnerProfile } from '@/features/owners/types'

interface Props {
  account?: Account
  owner?: OwnerProfile
}

/**
 * How complete the profile is, and what's missing.
 *
 * The value is entirely in the *list*, not the percentage: "60% complete"
 * alone is a guilt-trip with no action attached. Each unmet item names the
 * thing to do, and the whole card disappears once there's nothing left — a
 * permanent "100%" banner is clutter on every future visit.
 */
export function ProfileCompleteness({ account, owner }: Props) {
  if (!account) return null

  const checks = [
    { label: 'Add your name', done: Boolean(owner?.firstName && owner?.lastName) },
    { label: 'Verify your email', done: Boolean(account.emailVerified) },
    { label: 'Add a phone number', done: Boolean(account.phone) },
    { label: 'Turn on two-factor authentication', done: Boolean(account.mfaEnabled) },
  ]

  const done = checks.filter((c) => c.done).length
  const percent = Math.round((done / checks.length) * 100)

  if (done === checks.length) return null

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold">Finish setting up</span>
          <span className="tabnum font-mono text-xs text-text-muted">{percent}%</span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div
            className="interactive h-full rounded-pill bg-accent"
            style={{ width: `${Math.max(percent, 4)}%` }}
          />
        </div>

        <ul className="flex flex-col gap-1.5">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-xs">
              <span
                className={
                  check.done
                    ? 'flex h-4 w-4 flex-none items-center justify-center rounded-full bg-success-bg text-success'
                    : 'h-4 w-4 flex-none rounded-full border border-dashed border-border-strong'
                }
                aria-hidden
              >
                {check.done && <CheckIcon className="h-2.5 w-2.5" />}
              </span>
              <span className={check.done ? 'text-text-faint line-through' : 'text-text-muted'}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
