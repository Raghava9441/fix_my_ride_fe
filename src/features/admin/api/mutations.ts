import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import type { Account } from '@/features/accounts/types'
import { adminService } from './service'
import type { CreateTenantInput, Tenant, TenantStatus, UpdateTenantInput } from '../types'

function invalidateTenants(queryClient: QueryClient) {
  // `admin.all` covers tenants, pending tenants, the dashboard and the stats
  // tiles — all of which count tenants, so a single approval moves all four.
  void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()

  return useMutation<Tenant, ApiError, CreateTenantInput>({
    mutationKey: ['admin', 'create-tenant'],
    mutationFn: (input) => adminService.createTenant(input),
    onSuccess: () => invalidateTenants(queryClient),
  })
}

export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Tenant, ApiError, UpdateTenantInput>({
    mutationKey: ['admin', 'update-tenant', id],
    mutationFn: (input) => adminService.updateTenant(id, input),
    onSuccess: () => invalidateTenants(queryClient),
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['admin', 'delete-tenant'],
    mutationFn: (id) => adminService.deleteTenant(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.admin.tenant(id) })
      invalidateTenants(queryClient)
    },
  })
}

export function useUpdateTenantStatus() {
  const queryClient = useQueryClient()

  return useMutation<Tenant, ApiError, { id: string; status: TenantStatus }>({
    mutationKey: ['admin', 'update-tenant-status'],
    mutationFn: ({ id, status }) => adminService.updateTenantStatus(id, status),
    onSuccess: () => invalidateTenants(queryClient),
  })
}

export function useApproveTenant() {
  const queryClient = useQueryClient()

  return useMutation<Tenant, ApiError, string>({
    mutationKey: ['admin', 'approve-tenant'],
    mutationFn: (id) => adminService.approveTenant(id),
    onSuccess: () => invalidateTenants(queryClient),
  })
}

export function useRejectTenant() {
  const queryClient = useQueryClient()

  return useMutation<Tenant, ApiError, { id: string; reason?: string }>({
    mutationKey: ['admin', 'reject-tenant'],
    mutationFn: ({ id, reason }) => adminService.rejectTenant(id, reason),
    onSuccess: () => invalidateTenants(queryClient),
  })
}

/* ---------------- users ---------------- */

export function useSuspendUser() {
  const queryClient = useQueryClient()

  return useMutation<Account, ApiError, { id: string; reason?: string }>({
    mutationKey: ['admin', 'suspend-user'],
    mutationFn: ({ id, reason }) => adminService.suspendUser(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useActivateUser() {
  const queryClient = useQueryClient()

  return useMutation<Account, ApiError, string>({
    mutationKey: ['admin', 'activate-user'],
    mutationFn: (id) => adminService.activateUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

/* ---------------- maintenance ---------------- */

/**
 * Clearing the server cache invalidates the *client* cache too — every
 * cached response was derived from data the server has just dropped, and
 * leaving it in place means the UI keeps showing values the backend no
 * longer agrees with.
 */
export function useClearCache() {
  const queryClient = useQueryClient()

  return useMutation<{ cleared: boolean }, ApiError, void>({
    mutationKey: ['admin', 'clear-cache'],
    mutationFn: () => adminService.clearCache(),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useReindexSearch() {
  return useMutation<{ started: boolean }, ApiError, void>({
    mutationKey: ['admin', 'reindex-search'],
    mutationFn: () => adminService.reindexSearch(),
  })
}

export function useTriggerBackup() {
  return useMutation<{ started: boolean }, ApiError, void>({
    mutationKey: ['admin', 'backup'],
    mutationFn: () => adminService.backup(),
  })
}
