import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import type { Tenant, UpdateTenantInput } from '@/features/admin/types'
import { onboardingService, tenantService, type OnboardingSignupInput } from './service'

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

/**
 * Creates a workspace and its first account.
 *
 * Does not sign the user in: the backend may hold the tenant for admin
 * approval, so the caller decides what happens next based on
 * `requiresApproval` rather than this hook assuming a session exists.
 */
export function useOnboardingSignup() {
  return useMutation<
    { tenantId?: string; accountId?: string; requiresApproval?: boolean },
    ApiError,
    OnboardingSignupInput
  >({
    mutationKey: ['onboarding', 'signup'],
    mutationFn: (input) => onboardingService.signup(input),
  })
}
