import clsx from 'clsx'

/**
 * Indeterminate progress. Inherits `currentColor`, so it sits correctly on
 * any button variant without a colour prop.
 *
 * The `animate-spin` duration is fixed rather than token-driven because the
 * reduced-motion axis should *not* stop it: a frozen spinner reads as a
 * hung request. The OS-level reduced-motion rule in index.css deliberately
 * excludes it for the same reason.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ animationDuration: '900ms' }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 00-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
