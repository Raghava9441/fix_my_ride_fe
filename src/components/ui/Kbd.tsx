import type { ReactNode } from 'react'
import clsx from 'clsx'

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={clsx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-surface px-1.5 font-mono text-[10px] font-semibold text-text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/** ⌘ on Apple platforms, Ctrl everywhere else. */
export const modifierKeyLabel =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
