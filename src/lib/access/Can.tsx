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

  /*
   * `inert` on the inner wrapper, not `pointer-events-none`.
   *
   * The previous version was disabled in appearance only. `pointer-events:
   * none` stops the mouse and does nothing to the keyboard, so the control
   * stayed in the tab order and Enter still activated it — a "disabled"
   * button that anyone could still press. It also suppressed the very
   * `title` tooltip meant to explain the denial, because an element that
   * takes no pointer events receives no hover either: the reason was
   * computed, attached, and unreachable by every user.
   *
   * `inert` removes the subtree from the tab order, from hit-testing, and
   * from the accessibility tree in one attribute. The reason then lives on
   * the outer wrapper, which stays interactive precisely so it can be
   * hovered — with an `sr-only` copy, since a `title` is announced
   * inconsistently and never appears on touch.
   */
  return (
    <span title={decision.detail} className="inline-flex cursor-not-allowed">
      <span inert className="inline-flex opacity-50">
        {children}
      </span>
      <span className="sr-only">{decision.detail}</span>
    </span>
  )
}
