import type { FeatureFlagKey } from '../flags/flags'
import type { SessionUser } from '../auth/types'
import type { Capabilities } from './capabilities'
import { describePermission, type PermissionKey } from './permissions'
import { ACCOUNT_ROLE_LABELS, type AccountRole } from './roles'

/**
 * A composable access rule, and the evaluator that turns one into a decision.
 *
 * This is the load-bearing piece of the whole permission system. It is a
 * pure function over (rule, context) with no React, no router, and no
 * network in it, which is what lets the *same* rule object drive four
 * different things without any chance of them drifting apart:
 *
 *   - route guards          (can this URL render?)
 *   - navigation building   (does this nav item appear?)
 *   - the command palette   (is this command offered?)
 *   - `<Can>` / `useCan()`  (does this button render?)
 *
 * A nav item that appears but leads to a 403 is the classic failure of
 * hand-maintained parallel lists. Here it is structurally impossible: the
 * nav is derived from the same registry the router is built from, and both
 * ask this evaluator.
 *
 * Decisions are typed rather than boolean because the caller has to
 * distinguish "sign in and try again" (redirect to login, preserve the
 * destination) from "you will never be allowed here" (render 403). A
 * boolean collapses those into the same wrong answer.
 */

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

export type AccessRule =
  /** No session needed. Reachable signed in or out. */
  | { kind: 'public' }
  /** Only reachable signed *out* — login, register, forgot-password. */
  | { kind: 'anonymous' }
  /** Any signed-in principal. */
  | { kind: 'authenticated' }
  | { kind: 'permission'; permissions: PermissionKey[]; mode: 'all' | 'any' }
  | { kind: 'role'; roles: AccountRole[] }
  | { kind: 'flag'; flag: FeatureFlagKey }
  /** Signed in *and* scoped to a tenant — excludes platform admins. */
  | { kind: 'tenant' }
  /** Escape hatch for a check the declarative forms can't express. */
  | { kind: 'predicate'; label: string; test: (ctx: AccessContext) => boolean }
  | { kind: 'all'; rules: AccessRule[] }
  | { kind: 'any'; rules: AccessRule[] }
  | { kind: 'not'; rule: AccessRule }

export interface AccessContext {
  session: SessionUser | null
  capabilities: Capabilities
  isFlagEnabled: (flag: FeatureFlagKey) => boolean
}

/* ------------------------------------------------------------------ */
/* Decisions                                                           */
/* ------------------------------------------------------------------ */

export type DenialReason =
  /** Not signed in. The caller should redirect to login, not show a 403. */
  | 'unauthenticated'
  /** Signed in, but this route is for signed-out visitors. */
  | 'already-authenticated'
  | 'missing-permission'
  | 'missing-role'
  | 'flag-disabled'
  | 'tenant-required'
  | 'predicate-failed'

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: DenialReason; detail: string }

const ALLOW: AccessDecision = { allowed: true }

function deny(reason: DenialReason, detail: string): AccessDecision {
  return { allowed: false, reason, detail }
}

/**
 * How "recoverable" a denial is, most recoverable first. When an `any`
 * combinator fails every branch it reports the most recoverable reason —
 * telling someone to sign in is more useful than telling them they lack a
 * permission they might well have once signed in.
 */
const REASON_PRIORITY: DenialReason[] = [
  'unauthenticated',
  'already-authenticated',
  'tenant-required',
  'missing-role',
  'missing-permission',
  'predicate-failed',
  'flag-disabled',
]

function mostRecoverable(decisions: AccessDecision[]): AccessDecision {
  const denials = decisions.filter((d): d is Extract<AccessDecision, { allowed: false }> => !d.allowed)
  if (denials.length === 0) return ALLOW
  return denials.reduce((best, d) =>
    REASON_PRIORITY.indexOf(d.reason) < REASON_PRIORITY.indexOf(best.reason) ? d : best,
  )
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

export function evaluate(rule: AccessRule, ctx: AccessContext): AccessDecision {
  switch (rule.kind) {
    case 'public':
      return ALLOW

    case 'anonymous':
      return ctx.session
        ? deny('already-authenticated', 'Already signed in.')
        : ALLOW

    case 'authenticated':
      return ctx.session ? ALLOW : deny('unauthenticated', 'Sign in to continue.')

    case 'tenant':
      if (!ctx.session) return deny('unauthenticated', 'Sign in to continue.')
      return ctx.capabilities.tenantId
        ? ALLOW
        : deny('tenant-required', 'This area belongs to a workspace your account is not scoped to.')

    case 'role': {
      if (!ctx.session) return deny('unauthenticated', 'Sign in to continue.')
      const has = rule.roles.some((r) => ctx.capabilities.roles.has(r))
      if (has) return ALLOW
      const names = rule.roles.map((r) => ACCOUNT_ROLE_LABELS[r] ?? r).join(' or ')
      return deny('missing-role', `Requires the ${names} role.`)
    }

    case 'permission': {
      if (!ctx.session) return deny('unauthenticated', 'Sign in to continue.')
      // The superuser bit short-circuits before any set lookups.
      if (ctx.capabilities.isSuperuser) return ALLOW

      const held = (p: PermissionKey) => ctx.capabilities.permissions.has(p)
      const ok = rule.mode === 'all' ? rule.permissions.every(held) : rule.permissions.some(held)
      if (ok) return ALLOW

      const missing = rule.permissions.filter((p) => !held(p))
      const joiner = rule.mode === 'all' ? ' and ' : ' or '
      const names = (rule.mode === 'all' ? missing : rule.permissions).map(describePermission).join(joiner)
      return deny('missing-permission', `Requires permission to ${names}.`)
    }

    case 'flag':
      return ctx.isFlagEnabled(rule.flag)
        ? ALLOW
        : deny('flag-disabled', 'This feature is not switched on for your account.')

    case 'predicate':
      return rule.test(ctx) ? ALLOW : deny('predicate-failed', rule.label)

    case 'all': {
      for (const child of rule.rules) {
        const decision = evaluate(child, ctx)
        if (!decision.allowed) return decision
      }
      return ALLOW
    }

    case 'any': {
      if (rule.rules.length === 0) return ALLOW
      const decisions = rule.rules.map((child) => evaluate(child, ctx))
      return decisions.some((d) => d.allowed) ? ALLOW : mostRecoverable(decisions)
    }

    case 'not': {
      const inner = evaluate(rule.rule, ctx)
      return inner.allowed ? deny('predicate-failed', 'Not available for this account.') : ALLOW
    }
  }
}

export function isAllowed(rule: AccessRule, ctx: AccessContext): boolean {
  return evaluate(rule, ctx).allowed
}

/* ------------------------------------------------------------------ */
/* Builder DSL                                                         */
/* ------------------------------------------------------------------ */

/**
 * Terse constructors so a route declaration reads like a sentence:
 *
 *   access.all(access.tenant(), access.permission('staff_profile:manage'))
 *   access.any(access.role('admin'), access.permission('report:read_all'))
 */
export const access = {
  public: (): AccessRule => ({ kind: 'public' }),
  anonymous: (): AccessRule => ({ kind: 'anonymous' }),
  authenticated: (): AccessRule => ({ kind: 'authenticated' }),
  tenant: (): AccessRule => ({ kind: 'tenant' }),

  /** All of the listed permissions. */
  permission: (...permissions: PermissionKey[]): AccessRule => ({
    kind: 'permission',
    permissions,
    mode: 'all',
  }),
  /** At least one of the listed permissions. */
  anyPermission: (...permissions: PermissionKey[]): AccessRule => ({
    kind: 'permission',
    permissions,
    mode: 'any',
  }),

  /** At least one of the listed account roles. */
  role: (...roles: AccountRole[]): AccessRule => ({ kind: 'role', roles }),

  flag: (flag: FeatureFlagKey): AccessRule => ({ kind: 'flag', flag }),

  predicate: (label: string, test: (ctx: AccessContext) => boolean): AccessRule => ({
    kind: 'predicate',
    label,
    test,
  }),

  all: (...rules: AccessRule[]): AccessRule => ({ kind: 'all', rules }),
  any: (...rules: AccessRule[]): AccessRule => ({ kind: 'any', rules }),
  not: (rule: AccessRule): AccessRule => ({ kind: 'not', rule }),
} as const
