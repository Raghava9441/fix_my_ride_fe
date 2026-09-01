import type { BaseDocument, Id, ListParams } from '@/lib/api/domain'
import type { PermissionKey, PermissionScope } from '@/lib/access'

export type RoleType = 'system' | 'tenant' | 'custom'

export interface Role extends BaseDocument {
  name: string
  slug: string
  description?: string
  type: RoleType
  tenantId?: Id
  serviceCenterId?: Id
  /** Lower is more powerful. `system_admin` is 0. */
  level: number
  permissions?: Id[]
  inheritsFrom?: Id[]
  color?: string
  icon?: string
  maxUsers?: number
  isActive: boolean
  isDefault: boolean
  createdBy?: Id
}

export interface Permission extends BaseDocument {
  key: PermissionKey
  name: string
  description?: string
  resource: string
  action: string
  scope: PermissionScope
  isActive: boolean
  category?: string
  requiredPlan: 'free' | 'basic' | 'professional' | 'enterprise'
}

export interface RoleListFilters extends ListParams {
  type?: RoleType
  serviceCenterId?: Id
  isActive?: boolean
  [key: string]: string | number | boolean | undefined
}

export interface PermissionListFilters extends ListParams {
  resource?: string
  scope?: PermissionScope
  isActive?: boolean
  [key: string]: string | number | boolean | undefined
}

export interface CreateRoleInput {
  name: string
  slug?: string
  description?: string
  type?: RoleType
  level?: number
  serviceCenterId?: Id
  permissions?: Id[]
  inheritsFrom?: Id[]
  color?: string
}

export type UpdateRoleInput = Partial<CreateRoleInput> & { isActive?: boolean }

export interface CreatePermissionInput {
  key: string
  name: string
  description?: string
  resource: string
  action: string
  scope: PermissionScope
  requiredPlan?: Permission['requiredPlan']
}

export type UpdatePermissionInput = Partial<CreatePermissionInput> & { isActive?: boolean }
