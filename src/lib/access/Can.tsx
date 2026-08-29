import type { ReactNode } from 'react'
import { useAccess } from './AccessProvider'
import type { AccessRule } from './policy'

interface CanProps {
  rule: AccessRule
  children: ReactNode
  /** Rendered instead when the rule denies. Defaults to nothing. */
  fallback?: ReactNode
  /**
   * Render the children disabled rather than hidden, with the denial
   * reason as a title. Use for a primary action on a screen the user can
   * legitimately see — hiding it there reads as a bug, not a permission.
   */
  mode?: 'hide' | 'disable'
}

/**
 * Conditional rendering against the same rules the router uses.
 *
 *   <Can rule={access.permission('vehicle:create')}>
 *     <Button>Add vehicle</Button>
 *   </Can>
 *
 * The `disable` mode exists because "hide everything you can't do" is the
 * wrong default for in-page actions: a button that vanishes leaves the user
 * hunting for a feature they were told exists, while a disabled one with a
 * reason tells them who to ask.
 */
export function Can({ rule, children, fallback = null, mode = 'hide' }: CanProps) {
  const { decide } = useAccess()
  const decision = decide(rule)

  if (decision.allowed) return <>{children}</>
  if (mode === 'hide') return <>{fallback}</>

  return (
    <div
      title={decision.detail}
      aria-disabled="true"
      className="pointer-events-none inline-flex opacity-50 [&_*]:cursor-not-allowed"
    >
      {children}
    </div>
  )
}
