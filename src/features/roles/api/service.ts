import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type {
  CreatePermissionInput,
  CreateRoleInput,
  Permission,
  PermissionListFilters,
  Role,
  RoleListFilters,
  UpdatePermissionInput,
  UpdateRoleInput,
} from '../types'

/**
 * Role and permission API services — 11 + 6 endpoints under `/api/v1/roles`
 * and `/api/v1/permissions`.
 *
 * They live in one module because they're a single concern: a role is a
 * bundle of permissions, and every screen that edits one reads the other.
 *
 * Worth knowing: the backend gates most mutations here on
 * `requireRole('admin')`, but `POST /roles/:id/assign` and
 * `DELETE /roles/:id/assign/:accountId` are gated on `authenticate` alone —
 * any signed-in account can currently assign a role to any other account.
 * That is a server-side hole; the client rules on these screens don't close it.
 */

const ROLES = '/roles'
const PERMISSIONS = '/permissions'
const roleById = (id: string) => `${ROLES}/${encodeURIComponent(id)}`
const permissionById = (id: string) => `${PERMISSIONS}/${encodeURIComponent(id)}`

export const roleService = {
  list(filters: RoleListFilters = {}, signal?: AbortSignal): Promise<Page<Role>> {
    return fetchPage<Role>({
      url: ROLES,
      params: filters as QueryParams,
      signal,
      operation: 'roles.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Role> {
    return api.get<Role>(roleById(id), { signal, operation: 'roles.get' })
  },

  create(input: CreateRoleInput): Promise<Role> {
    return api.post<Role>(ROLES, input, { operation: 'roles.create' })
  },

  update(id: string, input: UpdateRoleInput): Promise<Role> {
    return api.put<Role>(roleById(id), input, { operation: 'roles.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(roleById(id), { operation: 'roles.delete' })
  },

  /** Resolved permission keys, including everything inherited. */
  permissions(id: string, signal?: AbortSignal): Promise<string[]> {
    return api.get<string[]>(`${roleById(id)}/permissions`, {
      signal,
      operation: 'roles.permissions',
    })
  },

  addPermission(id: string, permission: string): Promise<Role> {
    return api.post<Role>(`${roleById(id)}/permissions`, { permission }, {
      operation: 'roles.addPermission',
    })
  },

  removePermission(id: string, permissionId: string): Promise<void> {
    return api.delete<void>(`${roleById(id)}/permissions/${encodeURIComponent(permissionId)}`, {
      operation: 'roles.removePermission',
    })
  },

  assign(id: string, accountId: string): Promise<Role> {
    return api.post<Role>(`${roleById(id)}/assign`, { accountId }, { operation: 'roles.assign' })
  },

  unassign(id: string, accountId: string): Promise<void> {
    return api.delete<void>(`${roleById(id)}/assign/${encodeURIComponent(accountId)}`, {
      operation: 'roles.unassign',
    })
  },

  /** Seeds the fixed system-role hierarchy. Admin-only, and idempotent. */
  seed(): Promise<{ created: number }> {
    return api.post<{ created: number }>(`${ROLES}/seed`, undefined, { operation: 'roles.seed' })
  },
} as const

export const permissionService = {
  list(filters: PermissionListFilters = {}, signal?: AbortSignal): Promise<Page<Permission>> {
    return fetchPage<Permission>({
      url: PERMISSIONS,
      params: filters as QueryParams,
      signal,
      operation: 'permissions.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Permission> {
    return api.get<Permission>(permissionById(id), { signal, operation: 'permissions.get' })
  },

  create(input: CreatePermissionInput): Promise<Permission> {
    return api.post<Permission>(PERMISSIONS, input, { operation: 'permissions.create' })
  },

  update(id: string, input: UpdatePermissionInput): Promise<Permission> {
    return api.put<Permission>(permissionById(id), input, { operation: 'permissions.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(permissionById(id), { operation: 'permissions.delete' })
  },

  seed(): Promise<{ created: number }> {
    return api.post<{ created: number }>(`${PERMISSIONS}/seed`, undefined, {
      operation: 'permissions.seed',
    })
  },
} as const
