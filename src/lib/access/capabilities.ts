import type { SessionUser } from '../auth/types'
import { PERMISSIONS, type PermissionKey } from './permissions'
import { ACCOUNT_ROLE_GRANTS, RBAC_ROLE_GRANTS, type AccountRole } from './roles'

/**
 * The resolved answer to "what can this principal do", computed once per
 * session change and read by every guard, nav filter, and `<Can>` in the app.
 *
 * Set-based rather than array-based on purpose: permission checks run on
 * every render of every nav item and every route match, so they need to be
 * O(1).
 */
export interface Capabilities {
  permissions: ReadonlySet<PermissionKey>
  roles: ReadonlySet<AccountRole>
  /** Holds `system:admin` — bypasses every permission check. */
  isSuperuser: boolean
  tenantId: string | null
  /**
   * Whether permissions came from the server or were inferred from the
   * account role. Surfaced so the roles/permissions admin screens can be
   * honest about what they're showing.
   */
  source: 'server' | 'derived'
}

export const ANONYMOUS_CAPABILITIES: Capabilities = {
  permissions: new Set<PermissionKey>(),
  roles: new Set<AccountRole>(),
  isSuperuser: false,
  tenantId: null,
  source: 'derived',
}

/**
 * Turns a session into a capability set.
 *
 * The single seam between "what the API tells us" and "what the UI
 * believes". If `user.permissions` is populated (the API gained a resolved
 * permissions endpoint or claim), it is taken as authoritative and nothing
 * is inferred. Otherwise the set is unioned from the account roles and, if
 * known, the RBAC role — see ./roles.ts for why both exist.
 */
export function deriveCapabilities(user: SessionUser | null): Capabilities {
  if (!user) return ANONYMOUS_CAPABILITIES

  const roles = new Set<AccountRole>(user.roles)

  if (user.permissions && user.permissions.length > 0) {
    const permissions = new Set<PermissionKey>(user.permissions)
    return {
      permissions,
      roles,
      isSuperuser: permissions.has(PERMISSIONS.system.admin),
      tenantId: user.tenantId,
      source: 'server',
    }
  }

  const permissions = new Set<PermissionKey>()
  for (const role of roles) {
    for (const permission of ACCOUNT_ROLE_GRANTS[role] ?? []) permissions.add(permission)
  }
  if (user.rbacRole) {
    for (const permission of RBAC_ROLE_GRANTS[user.rbacRole] ?? []) permissions.add(permission)
  }

  return {
    permissions,
    roles,
    isSuperuser: permissions.has(PERMISSIONS.system.admin),
    tenantId: user.tenantId,
    source: 'derived',
  }
}
