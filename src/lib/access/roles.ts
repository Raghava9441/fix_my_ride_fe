/**
 * The two role vocabularies this product actually has, and the bridge
 * between them.
 *
 * The API carries both, and they are *not* the same list — mixing them up
 * is the single easiest way to write a check that is always true or always
 * false:
 *
 *   1. **Account role** (`Account.primaryRole` / `Account.roles`) — coarse,
 *      lives in the JWT, and is what the API's `requireRole(...)` guards
 *      compare against. This is the only role information the client can
 *      count on being present.
 *
 *   2. **RBAC role** (the `Role` collection: `system_admin`, `tenant_admin`,
 *      …) — fine-grained, referenced by `StaffProfile.roleId`, and the thing
 *      the permission catalog actually hangs off. It exists in the database
 *      and is returned by `/roles`, but no route enforces it yet.
 *
 * Because (2) is not in the token, the client derives its effective
 * permission set from (1) via `ACCOUNT_ROLE_GRANTS` below, and refines it
 * with (2) only when a staff profile has been loaded and tells us the RBAC
 * role. See ./capabilities.ts.
 */

import { ALL_PERMISSIONS, PERMISSIONS, type PermissionKey } from './permissions'

/* ------------------------------------------------------------------ */
/* 1. Account roles — the JWT vocabulary                               */
/* ------------------------------------------------------------------ */

export const ACCOUNT_ROLES = ['admin', 'owner', 'staff', 'fleet_manager', 'service_advisor'] as const

export type AccountRole = (typeof ACCOUNT_ROLES)[number]

export const ACCOUNT_ROLE_LABELS: Record<AccountRole, string> = {
  admin: 'Platform admin',
  owner: 'Account owner',
  staff: 'Staff',
  fleet_manager: 'Fleet manager',
  service_advisor: 'Service advisor',
}

export function isAccountRole(value: string): value is AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value)
}

/* ------------------------------------------------------------------ */
/* 2. RBAC roles — the Role collection's vocabulary                    */
/* ------------------------------------------------------------------ */

export const RBAC_ROLES = [
  'system_admin',
  'tenant_admin',
  'center_manager',
  'technician',
  'receptionist',
  'accountant',
  'vehicle_owner',
] as const

export type RbacRole = (typeof RBAC_ROLES)[number]

/** Lower level = more powerful. Mirrors `Role.seedSystemRoles()`. */
export const RBAC_ROLE_LEVELS: Record<RbacRole, number> = {
  system_admin: 0,
  tenant_admin: 10,
  center_manager: 20,
  technician: 30,
  receptionist: 40,
  accountant: 50,
  vehicle_owner: 100,
}

export const RBAC_ROLE_LABELS: Record<RbacRole, string> = {
  system_admin: 'System admin',
  tenant_admin: 'Tenant admin',
  center_manager: 'Service center manager',
  technician: 'Technician',
  receptionist: 'Receptionist',
  accountant: 'Accountant',
  vehicle_owner: 'Vehicle owner',
}

export function isRbacRole(value: string): value is RbacRole {
  return (RBAC_ROLES as readonly string[]).includes(value)
}

/* ------------------------------------------------------------------ */
/* Grant matrices                                                      */
/* ------------------------------------------------------------------ */

const P = PERMISSIONS

/** Everything an owner can do with their own vehicles and history. */
const OWNER_GRANTS: PermissionKey[] = [
  P.vehicle.create,
  P.vehicle.read,
  P.vehicle.update,
  P.vehicle.delete,
  P.serviceRecord.read,
  P.reminder.create,
  P.reminder.read,
  P.serviceCenter.read,
  P.report.read,
  P.billing.read,
]

/** Shop-floor work: sees every vehicle in the center, writes service records. */
const STAFF_GRANTS: PermissionKey[] = [
  P.vehicle.read,
  P.vehicle.readAll,
  P.vehicle.update,
  P.serviceRecord.create,
  P.serviceRecord.read,
  P.serviceRecord.readAll,
  P.serviceRecord.update,
  P.reminder.create,
  P.reminder.read,
  P.reminder.manage,
  P.serviceCenter.read,
  P.staffProfile.read,
  P.report.read,
  P.billing.read,
]

/**
 * Account role → permissions, in the absence of a `permissions` claim.
 *
 * This is a client-side approximation of intent, not a mirror of anything
 * the API enforces (it enforces almost none of it — see ./permissions.ts).
 * Deliberately conservative: it grants what a role plainly needs to do its
 * job, so a missing permission shows up as a hidden nav item rather than a
 * screen that 403s. Widening a row here is cheap; the server is what has to
 * get stricter.
 */
export const ACCOUNT_ROLE_GRANTS: Record<AccountRole, PermissionKey[]> = {
  // Platform admin. `system:admin` is the catch-all the evaluator treats as
  // a superuser bit, so the explicit list is belt-and-braces.
  admin: ALL_PERMISSIONS,

  owner: OWNER_GRANTS,

  staff: STAFF_GRANTS,

  // Manages a fleet of vehicles across centers — owner scope, wider read.
  fleet_manager: [...OWNER_GRANTS, P.vehicle.readAll, P.serviceRecord.readAll, P.report.readAll],

  // Front-of-house: books work in and invoices it out, no staff admin.
  service_advisor: [...STAFF_GRANTS, P.serviceRecord.delete, P.billing.manage],
}

/**
 * RBAC role → permissions, mirroring the hierarchy in `Role.seedSystemRoles()`.
 * Used only when a staff profile has told us which RBAC role applies; it
 * *narrows* nothing on its own, it's unioned with the account-role grants.
 */
export const RBAC_ROLE_GRANTS: Record<RbacRole, PermissionKey[]> = {
  system_admin: ALL_PERMISSIONS,
  tenant_admin: ALL_PERMISSIONS.filter((p) => p !== P.system.admin),
  center_manager: [
    ...STAFF_GRANTS,
    P.staffProfile.create,
    P.staffProfile.update,
    P.staffProfile.delete,
    P.staffProfile.manage,
    P.serviceCenter.update,
    P.serviceCenter.manage,
    P.serviceRecord.delete,
    P.billing.manage,
  ],
  technician: [
    P.vehicle.read,
    P.vehicle.readAll,
    P.serviceRecord.create,
    P.serviceRecord.read,
    P.serviceRecord.readAll,
    P.serviceRecord.update,
    P.serviceCenter.read,
  ],
  receptionist: [
    P.vehicle.read,
    P.vehicle.readAll,
    P.vehicle.create,
    P.serviceRecord.read,
    P.serviceRecord.readAll,
    P.serviceRecord.create,
    P.reminder.create,
    P.reminder.read,
    P.reminder.manage,
    P.serviceCenter.read,
  ],
  accountant: [P.billing.read, P.billing.manage, P.report.read, P.serviceRecord.read, P.serviceCenter.read],
  vehicle_owner: OWNER_GRANTS,
}

/** The most powerful (lowest-level) RBAC role in a list, for display. */
export function highestRbacRole(roles: RbacRole[]): RbacRole | null {
  if (roles.length === 0) return null
  return roles.reduce((best, r) => (RBAC_ROLE_LEVELS[r] < RBAC_ROLE_LEVELS[best] ? r : best))
}
