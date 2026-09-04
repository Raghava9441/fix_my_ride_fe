import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { useAuthStore } from '@/lib/auth/store'
import { onboardingService } from './service'

/**
 * Where an organisation's application has got to.
 *
 * ---- Why this is gated so tightly ----
 *
 * A signed-in session almost never needs this, because `auth.service.login()`
 * refuses to issue tokens at all while the tenant is `pending_review` or
 * `rejected` — it throws `AUTH_014`/`AUTH_015` before any token exists. So a
 * signed-in user is, with one exception, already past this gate and asking
 * would be a request per session that can only ever answer "approved".
 *
 * The exception is the session `POST /onboarding/signup` mints directly: it
 * returns tokens without going through login, so the applicant *is* inside
 * the app with a pending organisation. That session is also always
 * `pending_verification`, which is what this gates on — it costs nothing for
 * an established user and still covers the one case that can see a pending
 * tenant.
 *
 * Also gated on `tenantId`, since the endpoint 404s without one and platform
 * admins have none.
 */
export function useOnboardingStatus() {
  const tenantId = useAuthStore((s) => s.user?.tenantId)
  const accountStatus = useAuthStore((s) => s.user?.status)

  return useQuery({
    queryKey: queryKeys.session.onboardingStatus(),
    queryFn: ({ signal }) => onboardingService.status(signal),
    enabled: Boolean(tenantId) && accountStatus !== 'active',
    // Approval is a human decision measured in hours, not seconds. Polling it
    // hard would be pure load; a refetch on window focus is enough to catch
    // the change when someone comes back to the tab.
    staleTime: 5 * 60_000,
  })
}
