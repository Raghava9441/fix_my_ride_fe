import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type { ServiceRecord } from '@/features/service-records/types'
import type {
  CreateStaffInput,
  GrantPermissionInput,
  StaffListFilters,
  StaffPerformance,
  StaffProfile,
  UpdateStaffInput,
  WorkSchedule,
} from '../types'

/**
 * Staff API service — all 12 endpoints under `/api/v1/staff`.
 *
 * Worth knowing while building on this: the backend gates every one of these
 * on `authenticate` alone. There is no `requireRole` on this router and no
 * inline check in the controller, so any authenticated account in the tenant
 * — including a plain vehicle owner — can currently create, edit, and delete
 * staff. Tenant isolation still applies, so it isn't cross-tenant, but the
 * client-side permission rules on these screens are a UX contract, not a
 * security boundary. The gap needs closing server-side.
 */

const BASE = '/staff'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const staffService = {
  list(filters: StaffListFilters = {}, signal?: AbortSignal): Promise<Page<StaffProfile>> {
    return fetchPage<StaffProfile>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'staff.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<StaffProfile> {
    return api.get<StaffProfile>(byId(id), { signal, operation: 'staff.get' })
  },

  create(input: CreateStaffInput): Promise<StaffProfile> {
    return api.post<StaffProfile>(BASE, input, { operation: 'staff.create' })
  },

  update(id: string, input: UpdateStaffInput): Promise<StaffProfile> {
    return api.put<StaffProfile>(byId(id), input, { operation: 'staff.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'staff.delete' })
  },

  /* ---------------- permission overrides ---------------- */

  permissions(id: string, signal?: AbortSignal) {
    return api.get<string[]>(`${byId(id)}/permissions`, { signal, operation: 'staff.permissions' })
  },

  grantPermission(id: string, input: GrantPermissionInput) {
    return api.post<StaffProfile>(`${byId(id)}/permissions`, input, {
      operation: 'staff.grantPermission',
    })
  },

  revokePermission(id: string, permissionId: string) {
    return api.delete<void>(`${byId(id)}/permissions/${encodeURIComponent(permissionId)}`, {
      operation: 'staff.revokePermission',
    })
  },

  /* ---------------- schedule & performance ---------------- */

  schedule(id: string, signal?: AbortSignal) {
    return api.get<WorkSchedule>(`${byId(id)}/schedule`, { signal, operation: 'staff.schedule' })
  },

  /**
   * Replaces the whole weekly schedule.
   *
   * The body is wrapped in `workSchedule` while `GET /schedule` answers with
   * the bare object — `UpdateStaffScheduleSchema` requires the wrapper, and
   * sending the schedule flat is a 422 with no clue as to why. The asymmetry
   * is the API's; it is absorbed here so callers deal in one shape.
   *
   * The response is the updated `StaffProfile`, not a schedule: the endpoint
   * returns the whole document it just saved.
   */
  updateSchedule(id: string, input: WorkSchedule) {
    return api.put<StaffProfile>(
      `${byId(id)}/schedule`,
      { workSchedule: input },
      { operation: 'staff.updateSchedule' },
    )
  },

  performance(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return api.get<StaffPerformance>(`${byId(id)}/performance`, {
      params: filters,
      signal,
      operation: 'staff.performance',
    })
  },

  services(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<ServiceRecord>({
      url: `${byId(id)}/services`,
      params: filters,
      signal,
      operation: 'staff.services',
    })
  },
} as const
