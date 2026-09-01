import { api } from '@/lib/api'
import type { Tenant, UpdateTenantInput } from '@/features/admin/types'

/**
 * Tenant and onboarding services — the 2 endpoints under `/api/v1/tenants`
 * and the 2 under `/api/v1/onboarding`.
 *
 * These are the *self-serve* view of a workspace: the tenant reading and
 * editing its own record. The cross-tenant administration of every tenant
 * lives in `features/admin`, which is a different audience and a different
 * permission story.
 *
 * `Tenant` is reused from the admin feature rather than redeclared — it's the
 * same document, and two copies of a shape this large drift within a release.
 */

export const tenantService = {
  /** The signed-in user's own workspace. */
  me(signal?: AbortSignal): Promise<Tenant> {
    return api.get<Tenant>('/tenants/me', { signal, operation: 'tenants.me' })
  },

  /** Backend gates this on `requireRole('owner')`. */
  updateMe(input: UpdateTenantInput): Promise<Tenant> {
    return api.patch<Tenant>('/tenants/me', input, { operation: 'tenants.updateMe' })
  },
} as const

export interface OnboardingSignupInput {
  organizationName: string
  contactEmail: string
  password: string
  firstName?: string
  lastName?: string
  contactPhone?: string
}

export interface OnboardingStatus {
  step?: string
  completed?: boolean
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  [key: string]: unknown
}

export const onboardingService = {
  /**
   * Self-serve workspace creation. Anonymous by definition — there is no
   * account yet, so a 401 here could never mean "expired session".
   */
  signup(input: OnboardingSignupInput) {
    return api.post<{ tenantId?: string; accountId?: string; requiresApproval?: boolean }>(
      '/onboarding/signup',
      input,
      { anonymous: true, operation: 'onboarding.signup' },
    )
  },

  status(signal?: AbortSignal): Promise<OnboardingStatus> {
    return api.get<OnboardingStatus>('/onboarding/status', {
      signal,
      operation: 'onboarding.status',
    })
  },
} as const
