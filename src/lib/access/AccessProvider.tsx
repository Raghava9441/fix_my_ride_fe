import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuthStore } from '../auth/store'
import { useFlags } from '../flags/FlagsProvider'
import { deriveCapabilities, type Capabilities } from './capabilities'
import { evaluate, type AccessContext, type AccessDecision, type AccessRule } from './policy'
import type { PermissionKey } from './permissions'
import type { AccountRole } from './roles'

interface AccessContextValue extends AccessContext {
  capabilities: Capabilities
  /** Full decision, including *why* — what route guards need. */
  decide: (rule: AccessRule) => AccessDecision
  /** Boolean shorthand — what conditional rendering needs. */
  can: (rule: AccessRule) => boolean
  hasPermission: (permission: PermissionKey) => boolean
  hasRole: (...roles: AccountRole[]) => boolean
}

const AccessCtx = createContext<AccessContextValue | null>(null)

/**
 * Publishes one evaluation context for the whole tree.
 *
 * Sits below the auth store and the flag provider and above the router, so
 * every guard, nav item, and `<Can>` resolves against identical inputs. The
 * memo boundary matters: capability derivation walks the grant matrices, and
 * without it every nav render would redo that work.
 */
export function AccessProvider({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.user)
  const { isEnabled } = useFlags()

  const capabilities = useMemo(() => deriveCapabilities(session), [session])

  const value = useMemo<AccessContextValue>(() => {
    const ctx: AccessContext = { session, capabilities, isFlagEnabled: isEnabled }
    return {
      ...ctx,
      capabilities,
      decide: (rule) => evaluate(rule, ctx),
      can: (rule) => evaluate(rule, ctx).allowed,
      hasPermission: (permission) => capabilities.isSuperuser || capabilities.permissions.has(permission),
      hasRole: (...roles) => roles.some((r) => capabilities.roles.has(r)),
    }
  }, [session, capabilities, isEnabled])

  return <AccessCtx.Provider value={value}>{children}</AccessCtx.Provider>
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessCtx)
  if (!ctx) throw new Error('useAccess must be used within an AccessProvider')
  return ctx
}

/** `const canEditStaff = useCan(access.permission('staff_profile:update'))` */
export function useCan(rule: AccessRule): boolean {
  return useAccess().can(rule)
}

/** Same, but with the denial reason — for guards and explanatory empty states. */
export function useAccessDecision(rule: AccessRule): AccessDecision {
  return useAccess().decide(rule)
}
