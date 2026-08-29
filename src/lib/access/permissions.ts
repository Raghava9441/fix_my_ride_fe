/**
 * The permission catalog, mirrored from the API's `Permission.seedDefaults()`
 * (src/models/Permission.ts in the API repo).
 *
 * Keys are `resource:action`. This file is the *only* place a permission
 * string is written as a literal — everything else refers to
 * `PERMISSIONS.vehicle.read` so a renamed permission is a compile error
 * rather than a silently-always-false check.
 *
 * ---- Read this before relying on a permission for anything but UX ----
 *
 * The API does not currently gate most endpoints on these permissions.
 * Access tokens carry no `permissions` claim at all, and the model-level
 * `staff.can()` chain that resolves them is not wired into any route. Route
 * gating on the server today is coarse: `authenticate` plus, on a minority
 * of routes, `requireRole('admin' | 'owner' | 'staff')` against the
 * account's role list.
 *
 * So: permission checks in this client are a **navigational and UX
 * contract**, not a security boundary. They keep people out of screens
 * that would only fail or confuse, and they give us the vocabulary to turn
 * on real enforcement later. They must never be the only thing standing
 * between a user and someone else's data — that has to land server-side.
 * When the API starts issuing a `permissions` claim, `deriveCapabilities()`
 * in ./capabilities.ts is the single place that changes.
 */

export const PERMISSIONS = {
  vehicle: {
    create: 'vehicle:create',
    read: 'vehicle:read',
    readAll: 'vehicle:read_all',
    update: 'vehicle:update',
    delete: 'vehicle:delete',
  },
  serviceRecord: {
    create: 'service_record:create',
    read: 'service_record:read',
    readAll: 'service_record:read_all',
    update: 'service_record:update',
    delete: 'service_record:delete',
  },
  staffProfile: {
    create: 'staff_profile:create',
    read: 'staff_profile:read',
    update: 'staff_profile:update',
    delete: 'staff_profile:delete',
    manage: 'staff_profile:manage',
  },
  serviceCenter: {
    read: 'service_center:read',
    update: 'service_center:update',
    manage: 'service_center:manage',
  },
  reminder: {
    create: 'reminder:create',
    read: 'reminder:read',
    manage: 'reminder:manage',
  },
  report: {
    read: 'report:read',
    readAll: 'report:read_all',
  },
  billing: {
    read: 'billing:read',
    manage: 'billing:manage',
  },
  role: {
    manage: 'role:manage',
  },
  permission: {
    assign: 'permission:assign',
  },
  system: {
    admin: 'system:admin',
  },
} as const

type PermissionTree = typeof PERMISSIONS
type Leaves<T> = T extends string ? T : { [K in keyof T]: Leaves<T[K]> }[keyof T]

/** Every valid `resource:action` string, as a union. */
export type PermissionKey = Leaves<PermissionTree>

/**
 * Where a permission's authority stops. Mirrors the API's `scope` enum;
 * carried here so the client can explain *why* something is unavailable
 * ("this needs tenant-wide access") rather than just hiding it.
 */
export type PermissionScope = 'own' | 'center' | 'tenant' | 'global'

export const PERMISSION_SCOPES: Record<PermissionKey, PermissionScope> = {
  'vehicle:create': 'own',
  'vehicle:read': 'own',
  'vehicle:read_all': 'center',
  'vehicle:update': 'own',
  'vehicle:delete': 'own',
  'service_record:create': 'center',
  'service_record:read': 'own',
  'service_record:read_all': 'center',
  'service_record:update': 'center',
  'service_record:delete': 'center',
  'staff_profile:create': 'center',
  'staff_profile:read': 'center',
  'staff_profile:update': 'center',
  'staff_profile:delete': 'center',
  'staff_profile:manage': 'center',
  'service_center:read': 'center',
  'service_center:update': 'center',
  'service_center:manage': 'center',
  'reminder:create': 'own',
  'reminder:read': 'own',
  'reminder:manage': 'center',
  'report:read': 'center',
  'report:read_all': 'tenant',
  'billing:read': 'center',
  'billing:manage': 'center',
  'role:manage': 'tenant',
  'permission:assign': 'tenant',
  'system:admin': 'global',
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_SCOPES) as PermissionKey[]

/** Human-readable label for a permission, for the roles/permissions admin screens. */
export function describePermission(key: PermissionKey): string {
  const [resource, action] = key.split(':')
  const readableResource = resource.replace(/_/g, ' ')
  const readableAction = action.replace(/_/g, ' ')
  return `${readableAction} ${readableResource}`
}
