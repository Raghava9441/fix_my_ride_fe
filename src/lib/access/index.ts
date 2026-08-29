export { PERMISSIONS, PERMISSION_SCOPES, ALL_PERMISSIONS, describePermission } from './permissions'
export type { PermissionKey, PermissionScope } from './permissions'

export {
  ACCOUNT_ROLES,
  ACCOUNT_ROLE_LABELS,
  ACCOUNT_ROLE_GRANTS,
  RBAC_ROLES,
  RBAC_ROLE_LABELS,
  RBAC_ROLE_LEVELS,
  RBAC_ROLE_GRANTS,
  isAccountRole,
  isRbacRole,
  highestRbacRole,
} from './roles'
export type { AccountRole, RbacRole } from './roles'

export { deriveCapabilities, ANONYMOUS_CAPABILITIES } from './capabilities'
export type { Capabilities } from './capabilities'

export { access, evaluate, isAllowed } from './policy'
export type { AccessRule, AccessContext, AccessDecision, DenialReason } from './policy'

export { AccessProvider, useAccess, useCan, useAccessDecision } from './AccessProvider'
export { Can } from './Can'
