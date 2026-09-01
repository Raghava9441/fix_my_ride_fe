import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type { Notification } from '@/features/notifications/types'
import type { ServiceRecord } from '@/features/service-records/types'
import type { CreateVehicleInput, Vehicle } from '@/features/vehicles/types'
import type {
  OwnerExpenses,
  OwnerListFilters,
  OwnerNotificationPreferences,
  OwnerProfile,
  UpdateOwnerInput,
} from '../types'

/**
 * Owner API service — all 13 endpoints under `/api/v1/owners`.
 *
 * As with staff, the backend gates these on `authenticate` alone: there is no
 * ownership check in `OwnerController` for `getById`/`update`/`delete`, so the
 * id in the path is trusted. Treat the client-side rules on these screens as
 * UX, not authorization.
 */

const BASE = '/owners'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const ownerService = {
  list(filters: OwnerListFilters = {}, signal?: AbortSignal): Promise<Page<OwnerProfile>> {
    return fetchPage<OwnerProfile>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'owners.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<OwnerProfile> {
    return api.get<OwnerProfile>(byId(id), { signal, operation: 'owners.get' })
  },

  update(id: string, input: UpdateOwnerInput): Promise<OwnerProfile> {
    return api.put<OwnerProfile>(byId(id), input, { operation: 'owners.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'owners.delete' })
  },

  /* ---------------- vehicles ---------------- */

  vehicles(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<Vehicle>({
      url: `${byId(id)}/vehicles`,
      params: filters,
      signal,
      operation: 'owners.vehicles',
    })
  },

  addVehicle(id: string, input: CreateVehicleInput) {
    return api.post<Vehicle>(`${byId(id)}/vehicles`, input, { operation: 'owners.addVehicle' })
  },

  /* ---------------- history & spend ---------------- */

  serviceHistory(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<ServiceRecord>({
      url: `${byId(id)}/service-history`,
      params: filters,
      signal,
      operation: 'owners.serviceHistory',
    })
  },

  expenses(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return api.get<OwnerExpenses>(`${byId(id)}/expenses`, {
      params: filters,
      signal,
      operation: 'owners.expenses',
    })
  },

  /* ---------------- notifications ----------------
   * Owner-scoped notifications are a separate collection from the global
   * `/notifications` resource, so they get their own calls rather than a
   * filter on that one.
   */

  notifications(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<Notification>({
      url: `${byId(id)}/notifications`,
      params: filters,
      signal,
      operation: 'owners.notifications',
    })
  },

  markNotificationRead(id: string, notificationId: string) {
    return api.patch<Notification>(
      `${byId(id)}/notifications/${encodeURIComponent(notificationId)}/read`,
      undefined,
      { operation: 'owners.markNotificationRead' },
    )
  },

  clearNotifications(id: string) {
    return api.delete<void>(`${byId(id)}/notifications`, {
      operation: 'owners.clearNotifications',
    })
  },

  /* ---------------- preferences ---------------- */

  preferences(id: string, signal?: AbortSignal) {
    return api.get<OwnerNotificationPreferences>(`${byId(id)}/preferences`, {
      signal,
      operation: 'owners.preferences',
    })
  },

  updatePreferences(id: string, input: OwnerNotificationPreferences) {
    return api.put<OwnerNotificationPreferences>(`${byId(id)}/preferences`, input, {
      operation: 'owners.updatePreferences',
    })
  },
} as const
