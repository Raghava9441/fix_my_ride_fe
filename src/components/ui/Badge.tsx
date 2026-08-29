import type { ReactNode } from 'react'
import clsx from 'clsx'

export type Tone = 'accent' | 'success' | 'warning' | 'critical' | 'info' | 'neutral'

const toneClass: Record<Tone, string> = {
  accent: 'bg-accent-bg text-accent',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  critical: 'bg-critical-bg text-critical',
  info: 'bg-info-bg text-info',
  neutral: 'bg-surface-sunken text-text-muted',
}

/**
 * Status pill.
 *
 * The dot is not decoration — it is what keeps the badge readable for a
 * user whose colour-vision axis can't separate two of the tones, and in a
 * greyscale print. Status is never carried by hue alone anywhere in this
 * app, which is why the dot isn't optional.
 */
export function Badge({
  tone = 'neutral',
  children,
  dot = true,
  className,
}: {
  tone?: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex w-fit items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold',
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 flex-none rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}
