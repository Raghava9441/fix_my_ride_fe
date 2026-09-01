import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type { Document } from '@/features/documents/types'
import type { StaffProfile } from '@/features/staff/types'
import type { Vehicle } from '@/features/vehicles/types'
import type {
  CreateReviewInput,
  CreateServiceCenterInput,
  NearbyFilters,
  OfferedService,
  ServiceCenter,
  ServiceCenterListFilters,
  ServiceCenterReview,
  ServiceCenterSettings,
  ServiceCenterStats,
  UpdateServiceCenterInput,
} from '../types'

/**
 * Service-center API service — all 20 endpoints under `/api/v1/service-centers`.
 */

const BASE = '/service-centers'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const serviceCenterService = {
  list(filters: ServiceCenterListFilters = {}, signal?: AbortSignal): Promise<Page<ServiceCenter>> {
    return fetchPage<ServiceCenter>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'serviceCenters.list',
    })
  },

  /**
   * Geo search. Coordinates change on every map pan, so callers should
   * quantise them before passing them in — otherwise each pixel of movement
   * mints a new query key and a new request.
   */
  nearby(filters: NearbyFilters, signal?: AbortSignal): Promise<ServiceCenter[]> {
    return api.get<ServiceCenter[]>(`${BASE}/nearby`, {
      params: filters as QueryParams,
      signal,
      operation: 'serviceCenters.nearby',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<ServiceCenter> {
    return api.get<ServiceCenter>(byId(id), { signal, operation: 'serviceCenters.get' })
  },

  create(input: CreateServiceCenterInput): Promise<ServiceCenter> {
    return api.post<ServiceCenter>(BASE, input, { operation: 'serviceCenters.create' })
  },

  update(id: string, input: UpdateServiceCenterInput): Promise<ServiceCenter> {
    return api.put<ServiceCenter>(byId(id), input, { operation: 'serviceCenters.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'serviceCenters.delete' })
  },

  /* ---------------- related collections ---------------- */

  vehicles(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<Vehicle>({
      url: `${byId(id)}/vehicles`,
      params: filters,
      signal,
      operation: 'serviceCenters.vehicles',
    })
  },

  staff(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<StaffProfile>({
      url: `${byId(id)}/staff`,
      params: filters,
      signal,
      operation: 'serviceCenters.staff',
    })
  },

  stats(id: string, signal?: AbortSignal) {
    return api.get<ServiceCenterStats>(`${byId(id)}/stats`, {
      signal,
      operation: 'serviceCenters.stats',
    })
  },

  /* ---------------- offered services ---------------- */

  services(id: string, signal?: AbortSignal) {
    return api.get<OfferedService[]>(`${byId(id)}/services`, {
      signal,
      operation: 'serviceCenters.services',
    })
  },

  addService(id: string, input: OfferedService) {
    return api.post<OfferedService>(`${byId(id)}/services`, input, {
      operation: 'serviceCenters.addService',
    })
  },

  updateService(id: string, serviceId: string, input: Partial<OfferedService>) {
    return api.put<OfferedService>(`${byId(id)}/services/${encodeURIComponent(serviceId)}`, input, {
      operation: 'serviceCenters.updateService',
    })
  },

  removeService(id: string, serviceId: string) {
    return api.delete<void>(`${byId(id)}/services/${encodeURIComponent(serviceId)}`, {
      operation: 'serviceCenters.removeService',
    })
  },

  /* ---------------- reviews ---------------- */

  reviews(id: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<ServiceCenterReview>({
      url: `${byId(id)}/reviews`,
      params: filters,
      signal,
      operation: 'serviceCenters.reviews',
    })
  },

  addReview(id: string, input: CreateReviewInput) {
    return api.post<ServiceCenterReview>(`${byId(id)}/reviews`, input, {
      operation: 'serviceCenters.addReview',
    })
  },

  /* ---------------- verification, documents, settings ---------------- */

  verify(id: string) {
    return api.post<ServiceCenter>(`${byId(id)}/verify`, undefined, {
      operation: 'serviceCenters.verify',
    })
  },

  documents(id: string, signal?: AbortSignal) {
    return api.get<Document[]>(`${byId(id)}/documents`, {
      signal,
      operation: 'serviceCenters.documents',
    })
  },

  addDocument(id: string, body: FormData) {
    return api.post<Document>(`${byId(id)}/documents`, body, {
      operation: 'serviceCenters.addDocument',
    })
  },

  settings(id: string, signal?: AbortSignal) {
    return api.get<ServiceCenterSettings>(`${byId(id)}/settings`, {
      signal,
      operation: 'serviceCenters.settings',
    })
  },

  updateSettings(id: string, input: Partial<ServiceCenterSettings>) {
    return api.put<ServiceCenterSettings>(`${byId(id)}/settings`, input, {
      operation: 'serviceCenters.updateSettings',
    })
  },
} as const
