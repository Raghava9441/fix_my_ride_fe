import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { permissionService, roleService } from './service'
import type {
  CreatePermissionInput,
  CreateRoleInput,
  Permission,
  Role,
  UpdatePermissionInput,
  UpdateRoleInput,
} from '../types'

/**
 * Changing a role or its permissions can change what the *current* user is
 * allowed to do, and that drives which routes and nav items they can reach.
 * So every write here also invalidates the session — otherwise the UI stays
 * gated on the capability set it resolved at sign-in.
 */
function invalidateAccessControl(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
}

export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation<Role, ApiError, CreateRoleInput>({
    mutationKey: ['roles', 'create'],
    mutationFn: (input) => roleService.create(input),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Role, ApiError, UpdateRoleInput>({
    mutationKey: ['roles', 'update', id],
    mutationFn: (input) => roleService.update(id, input),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['roles', 'delete'],
    mutationFn: (id) => roleService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.roles.detail(id) })
      invalidateAccessControl(queryClient)
    },
  })
}

export function useAddRolePermission(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Role, ApiError, string>({
    mutationKey: ['roles', 'add-permission', id],
    mutationFn: (permission) => roleService.addPermission(id, permission),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useRemoveRolePermission(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['roles', 'remove-permission', id],
    mutationFn: (permissionId) => roleService.removePermission(id, permissionId),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useAssignRole() {
  const queryClient = useQueryClient()

  return useMutation<Role, ApiError, { roleId: string; accountId: string }>({
    mutationKey: ['roles', 'assign'],
    mutationFn: ({ roleId, accountId }) => roleService.assign(roleId, accountId),
    onSuccess: () => {
      invalidateAccessControl(queryClient)
      // The account's own permission list changed.
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useUnassignRole() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, { roleId: string; accountId: string }>({
    mutationKey: ['roles', 'unassign'],
    mutationFn: ({ roleId, accountId }) => roleService.unassign(roleId, accountId),
    onSuccess: () => {
      invalidateAccessControl(queryClient)
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useSeedRoles() {
  const queryClient = useQueryClient()

  return useMutation<{ created: number }, ApiError, void>({
    mutationKey: ['roles', 'seed'],
    mutationFn: () => roleService.seed(),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

/* ---------------- permissions ---------------- */

export function useCreatePermission() {
  const queryClient = useQueryClient()

  return useMutation<Permission, ApiError, CreatePermissionInput>({
    mutationKey: ['permissions', 'create'],
    mutationFn: (input) => permissionService.create(input),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useUpdatePermission(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Permission, ApiError, UpdatePermissionInput>({
    mutationKey: ['permissions', 'update', id],
    mutationFn: (input) => permissionService.update(id, input),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useDeletePermission() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['permissions', 'delete'],
    mutationFn: (id) => permissionService.remove(id),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}

export function useSeedPermissions() {
  const queryClient = useQueryClient()

  return useMutation<{ created: number }, ApiError, void>({
    mutationKey: ['permissions', 'seed'],
    mutationFn: () => permissionService.seed(),
    onSuccess: () => invalidateAccessControl(queryClient),
  })
}
