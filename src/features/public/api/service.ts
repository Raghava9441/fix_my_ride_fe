import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type { ServiceCenter, ServiceCenterReview } from '@/features/service-centers/types'

/**
 * Public API service — the 11 endpoints under `/api/v1/public`.
 *
 * Every call here sets `anonymous: true`. That is the important detail: these
 * are rendered on marketing and directory pages where the visitor usually has
 * no session, and attaching a stale token would make a 401 look like an
 * expired session and trigger a pointless refresh — which, on failure, would
 * sign out a browsing user who *did* have a session.
 *
 * The `/health` and `/version` endpoints are included for a status page;
 * they're infrastructure probes, not product data.
 */

const BASE = '/public'

export interface PublicInfo {
  name?: string
  environment?: string
  [key: string]: unknown
}

export interface ContactInput {
  name: string
  email: string
  subject?: string
  message: string
}

export const publicService = {
  info(signal?: AbortSignal): Promise<PublicInfo> {
    return api.get<PublicInfo>(`${BASE}/info`, {
      anonymous: true,
      signal,
      operation: 'public.info',
    })
  },

  version(signal?: AbortSignal): Promise<{ version?: string }> {
    return api.get<{ version?: string }>(`${BASE}/version`, {
      anonymous: true,
      signal,
      operation: 'public.version',
    })
  },

  health(signal?: AbortSignal): Promise<{ status?: string }> {
    return api.get<{ status?: string }>(`${BASE}/health`, {
      anonymous: true,
      signal,
      // Health checks should fail fast rather than sit on the default budget.
      timeoutMs: 5_000,
      operation: 'public.health',
    })
  },

  healthDetailed(signal?: AbortSignal): Promise<Record<string, unknown>> {
    return api.get<Record<string, unknown>>(`${BASE}/health/detailed`, {
      anonymous: true,
      signal,
      timeoutMs: 10_000,
      operation: 'public.healthDetailed',
    })
  },

  /* ---------------- public directory ---------------- */

  serviceCenters(filters: QueryParams = {}, signal?: AbortSignal): Promise<Page<ServiceCenter>> {
    return fetchPage<ServiceCenter>({
      url: `${BASE}/service-centers`,
      params: filters,
      anonymous: true,
      signal,
      operation: 'public.serviceCenters',
    })
  },

  serviceCenter(id: string, signal?: AbortSignal): Promise<ServiceCenter> {
    return api.get<ServiceCenter>(`${BASE}/service-centers/${encodeURIComponent(id)}`, {
      anonymous: true,
      signal,
      operation: 'public.serviceCenter',
    })
  },

  serviceCenterReviews(
    id: string,
    filters: QueryParams = {},
    signal?: AbortSignal,
  ): Promise<Page<ServiceCenterReview>> {
    return fetchPage<ServiceCenterReview>({
      url: `${BASE}/service-centers/${encodeURIComponent(id)}/reviews`,
      params: filters,
      anonymous: true,
      signal,
      operation: 'public.serviceCenterReviews',
    })
  },

  /* ---------------- forms ---------------- */

  contact(input: ContactInput) {
    return api.post<{ sent: boolean }>(`${BASE}/contact`, input, {
      anonymous: true,
      operation: 'public.contact',
    })
  },

  subscribeNewsletter(email: string) {
    return api.post<{ subscribed: boolean }>(`${BASE}/newsletter/subscribe`, { email }, {
      anonymous: true,
      operation: 'public.newsletterSubscribe',
    })
  },

  unsubscribeNewsletter(email: string, token?: string) {
    return api.post<{ unsubscribed: boolean }>(
      `${BASE}/newsletter/unsubscribe`,
      { email, token },
      { anonymous: true, operation: 'public.newsletterUnsubscribe' },
    )
  },

  /** GET, per the backend, despite reading like an action. */
  requestDemo(params: QueryParams, signal?: AbortSignal) {
    return api.get<{ requested: boolean }>(`${BASE}/demo/request`, {
      params,
      anonymous: true,
      signal,
      operation: 'public.demoRequest',
    })
  },
} as const
