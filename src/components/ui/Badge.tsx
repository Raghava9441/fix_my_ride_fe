import type { ReactNode } from 'react'
import clsx from 'clsx'

type Tone = 'accent' | 'success' | 'warning' | 'critical' | 'neutral'

const toneClass: Record<Tone, string> = {
  accent: 'bg-accent-bg text-accent',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  critical: 'bg-critical-bg text-critical',
  neutral: 'bg-surface-sunken text-text-muted',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex w-fit items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold',
        toneClass[tone],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
