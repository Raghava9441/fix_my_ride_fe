import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { onboardingService, tenantService } from './service'

/**
 * The signed-in user's workspace.
 *
 * Read by the shell (workspace name, plan limits, feature flags derived from
 * the plan), so it's mounted on effectively every screen and gets a long
 * freshness window — a tenant record changes on the order of weeks.
 */
export function useMyTenant(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tenant.me(),
    queryFn: ({ signal }) => tenantService.me(signal),
    staleTime: 10 * 60_000,
    enabled: options?.enabled ?? true,
  })
}

export function useOnboardingStatus(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.session.onboardingStatus(),
    queryFn: ({ signal }) => onboardingService.status(signal),
    enabled: options?.enabled ?? true,
  })
}
