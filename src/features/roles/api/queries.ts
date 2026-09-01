import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { permissionService, roleService } from './service'
import type { PermissionListFilters, RoleListFilters } from '../types'

/**
 * Roles and permissions change rarely — they're configuration, not
 * transactional data — so they get a long freshness window. Every screen that
 * renders a role picker reads these, and refetching a static catalogue on
 * each mount is pure waste.
 */
const CONFIG_STALE_TIME = 10 * 60_000

export function useRoles(filters: RoleListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.roles.list(filters),
    queryFn: ({ signal }) => roleService.list(filters, signal),
    staleTime: CONFIG_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function useRole(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roles.detail(id ?? ''),
    queryFn: ({ signal }) => roleService.get(id!, signal),
    enabled: Boolean(id),
    staleTime: CONFIG_STALE_TIME,
  })
}

export function useRolePermissions(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roles.permissions(id ?? ''),
    queryFn: ({ signal }) => roleService.permissions(id!, signal),
    enabled: Boolean(id),
    staleTime: CONFIG_STALE_TIME,
  })
}

export function usePermissions(filters: PermissionListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.permissions.list(filters),
    queryFn: ({ signal }) => permissionService.list(filters, signal),
    staleTime: CONFIG_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function usePermission(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.permissions.detail(id ?? ''),
    queryFn: ({ signal }) => permissionService.get(id!, signal),
    enabled: Boolean(id),
    staleTime: CONFIG_STALE_TIME,
  })
}
