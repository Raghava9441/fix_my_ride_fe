import { api } from '@/lib/api'
import type { Tenant, UpdateTenantInput } from '@/features/admin/types'

/**
 * Tenant service — the 2 endpoints under `/api/v1/tenants`.
 *
 * The *self-serve* view of a workspace: the tenant reading and editing its
 * own record. The cross-tenant administration of every tenant lives in
 * `features/admin`, which is a different audience and a different permission
 * story; onboarding lives in `features/onboarding`, which owns the signup
 * and status shapes.
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
