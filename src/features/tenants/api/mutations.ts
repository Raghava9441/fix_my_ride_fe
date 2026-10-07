import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import type { Tenant, UpdateTenantInput } from '@/features/admin/types'
import { tenantService } from './service'

export function useUpdateMyTenant() {
  const queryClient = useQueryClient()

  return useMutation<Tenant, ApiError, UpdateTenantInput>({
    mutationKey: ['tenants', 'update-me'],
    mutationFn: (input) => tenantService.updateMe(input),
    onSuccess: (tenant) => {
      queryClient.setQueryData(queryKeys.tenant.me(), tenant)
    },
  })
}
