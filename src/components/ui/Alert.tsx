import type { ReactNode } from 'react'
import clsx from 'clsx'
import { AlertIcon, CheckIcon } from '@/components/icons'

export type AlertTone = 'critical' | 'warning' | 'success' | 'info'

interface AlertProps {
  tone?: AlertTone
  /** Optional bold first line. Omit for a single-sentence alert. */
  title?: string
  children: ReactNode
  /** Rendered under the message — a retry button, a link to somewhere else. */
  action?: ReactNode
  /** Monospace footnote, for a correlation id worth quoting to support. */
  reference?: string
  className?: string
}

const tones: Record<AlertTone, { box: string; icon: string }> = {
  critical: { box: 'border-critical/30 bg-critical-bg', icon: 'text-critical' },
  warning: { box: 'border-warning/30 bg-warning-bg', icon: 'text-warning' },
  success: { box: 'border-success/30 bg-success-bg', icon: 'text-success' },
  info: { box: 'border-border bg-surface-sunken', icon: 'text-text-muted' },
}

/**
 * A message that stays on screen.
 *
 * Distinct from `Toast`, and the difference is not styling — it's whether the
 * user still needs the message after four seconds. A toast is right for
 * "saved" and wrong for "we couldn't sign you in": a form error has to remain
 * visible next to the form while they fix it, has to survive a re-render, and
 * has to be readable by someone who looked away. Toast was the only feedback
 * channel in this app before this component existed, which meant every
 * failure that needed to persist either vanished or was hand-rolled inline.
 *
 * `role` is chosen from the tone rather than fixed. `alert` interrupts a
 * screen reader immediately, which is right for a failure the user must act
 * on and wrong for a confirmation — announcing "your password was changed"
 * over the top of whatever someone is reading is hostile.
 */
export function Alert({ tone = 'critical', title, children, action, reference, className }: AlertProps) {
  const styles = tones[tone]
  const isUrgent = tone === 'critical' || tone === 'warning'

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      className={clsx('flex items-start gap-2.5 rounded-card border px-3 py-2.5', styles.box, className)}
    >
      <span className={clsx('mt-0.5 flex h-4 w-4 flex-none items-center justify-center', styles.icon)}>
        {tone === 'success' ? <CheckIcon className="h-4 w-4" /> : <AlertIcon className="h-4 w-4" />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title && <p className="text-sm font-semibold text-text">{title}</p>}
        <div className="text-sm text-text-muted">{children}</div>
        {reference && (
          <p className="font-mono text-[11px] text-text-faint">Reference: {reference}</p>
        )}
        {action && <div className="mt-1 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  )
}
