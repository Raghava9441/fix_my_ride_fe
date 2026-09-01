import { api, fetchPage, request, type Page, type QueryParams } from '@/lib/api'
import type { Document } from '@/features/documents/types'
import type { Reminder } from '@/features/reminders/types'
import type { ServiceRecord } from '@/features/service-records/types'
import type {
  AuthorizeServiceCenterInput,
  CreateVehicleInput,
  OdometerReading,
  RecordOdometerInput,
  TransferOwnershipInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleInsurance,
  VehicleListFilters,
  VehicleStats,
  VehicleWarranty,
} from '../types'

/**
 * Vehicle API service — all 33 endpoints under `/api/v1/vehicles`.
 *
 * The feature's entire knowledge of the HTTP surface: paths, parameter
 * shapes, and response types. Nothing here knows about React, and nothing
 * re-implements transport concerns — retry, auth, timeouts, deduplication,
 * and telemetry all come from the shared client.
 *
 * This is the layer that makes the architecture hold at hundreds of
 * endpoints. Each feature owns one of these; the client stays a single file
 * that none of them modify.
 *
 * Every call carries a stable `operation` label, because metrics and logs are
 * keyed on it. Without one, `/vehicles/abc123` and `/vehicles/def456` become
 * separate time series — the high-cardinality mistake that gets metrics
 * dropped by the backend.
 */

const BASE = '/vehicles'
const byId = (vehicleId: string) => `${BASE}/${encodeURIComponent(vehicleId)}`

export const vehicleService = {
  /* ---------------- collection ---------------- */

  list(filters: VehicleListFilters = {}, signal?: AbortSignal): Promise<Page<Vehicle>> {
    return fetchPage<Vehicle>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'vehicles.list',
    })
  },

  search(term: string, signal?: AbortSignal): Promise<Vehicle[]> {
    return api.get<Vehicle[]>(`${BASE}/search`, {
      params: { q: term },
      signal,
      operation: 'vehicles.search',
    })
  },

  getByRegistration(registrationNumber: string, signal?: AbortSignal): Promise<Vehicle> {
    return api.get<Vehicle>(`${BASE}/registration/${encodeURIComponent(registrationNumber)}`, {
      signal,
      operation: 'vehicles.getByRegistration',
    })
  },

  getByVin(vin: string, signal?: AbortSignal): Promise<Vehicle> {
    return api.get<Vehicle>(`${BASE}/vin/${encodeURIComponent(vin)}`, {
      signal,
      operation: 'vehicles.getByVin',
    })
  },

  get(vehicleId: string, signal?: AbortSignal): Promise<Vehicle> {
    return api.get<Vehicle>(byId(vehicleId), { signal, operation: 'vehicles.get' })
  },

  // No `retry` flag on any mutation below: POST/PATCH are non-idempotent and
  // the transport refuses to retry them automatically. A timeout on create
  // could mean the record *was* written, and a silent retry would duplicate it.
  create(input: CreateVehicleInput): Promise<Vehicle> {
    return api.post<Vehicle>(BASE, input, { operation: 'vehicles.create' })
  },

  update(vehicleId: string, input: UpdateVehicleInput): Promise<Vehicle> {
    return api.put<Vehicle>(byId(vehicleId), input, { operation: 'vehicles.update' })
  },

  remove(vehicleId: string): Promise<void> {
    return api.delete<void>(byId(vehicleId), { operation: 'vehicles.delete' })
  },

  /* ---------------- service history ---------------- */

  serviceRecords(vehicleId: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<ServiceRecord>({
      url: `${byId(vehicleId)}/service-records`,
      params: filters,
      signal,
      operation: 'vehicles.serviceRecords',
    })
  },

  /* ---------------- authorized service centers ---------------- */

  serviceCenters(vehicleId: string, signal?: AbortSignal) {
    return api.get<Vehicle['authorizedServiceCenters']>(`${byId(vehicleId)}/service-centers`, {
      signal,
      operation: 'vehicles.serviceCenters',
    })
  },

  authorizeServiceCenter(vehicleId: string, input: AuthorizeServiceCenterInput) {
    return api.post<Vehicle>(`${byId(vehicleId)}/service-centers`, input, {
      operation: 'vehicles.authorizeCenter',
    })
  },

  updateServiceCenterAccess(vehicleId: string, centerId: string, input: { accessLevel?: string; isPrimary?: boolean }) {
    return api.put<Vehicle>(
      `${byId(vehicleId)}/service-centers/${encodeURIComponent(centerId)}`,
      input,
      { operation: 'vehicles.updateCenterAccess' },
    )
  },

  revokeServiceCenter(vehicleId: string, centerId: string) {
    return api.delete<void>(`${byId(vehicleId)}/service-centers/${encodeURIComponent(centerId)}`, {
      operation: 'vehicles.revokeCenter',
    })
  },

  /* ---------------- odometer ----------------
   * Two overlapping APIs exist on the backend: a scalar `/odometer` pair and
   * a full `/odometer-readings` sub-resource. Both are exposed here because
   * both are live; prefer the readings collection for anything that needs
   * history, verification, or correction.
   */

  odometer(vehicleId: string, signal?: AbortSignal) {
    return api.get<Vehicle['currentOdometer']>(`${byId(vehicleId)}/odometer`, {
      signal,
      operation: 'vehicles.odometer',
    })
  },

  recordOdometer(vehicleId: string, input: RecordOdometerInput) {
    return api.post<Vehicle>(`${byId(vehicleId)}/odometer`, input, {
      operation: 'vehicles.recordOdometer',
    })
  },

  odometerHistory(vehicleId: string, signal?: AbortSignal) {
    return api.get<OdometerReading[]>(`${byId(vehicleId)}/odometer/history`, {
      signal,
      operation: 'vehicles.odometerHistory',
    })
  },

  odometerReadings(vehicleId: string, filters: QueryParams = {}, signal?: AbortSignal) {
    return fetchPage<OdometerReading>({
      url: `${byId(vehicleId)}/odometer-readings`,
      params: filters,
      signal,
      operation: 'vehicles.odometerReadings',
    })
  },

  createOdometerReading(vehicleId: string, input: RecordOdometerInput) {
    return api.post<OdometerReading>(`${byId(vehicleId)}/odometer-readings`, input, {
      operation: 'vehicles.createOdometerReading',
    })
  },

  odometerReading(vehicleId: string, readingId: string, signal?: AbortSignal) {
    return api.get<OdometerReading>(
      `${byId(vehicleId)}/odometer-readings/${encodeURIComponent(readingId)}`,
      { signal, operation: 'vehicles.odometerReading' },
    )
  },

  updateOdometerReading(vehicleId: string, readingId: string, input: Partial<RecordOdometerInput>) {
    return api.patch<OdometerReading>(
      `${byId(vehicleId)}/odometer-readings/${encodeURIComponent(readingId)}`,
      input,
      { operation: 'vehicles.updateOdometerReading' },
    )
  },

  verifyOdometerReading(vehicleId: string, readingId: string) {
    return api.patch<OdometerReading>(
      `${byId(vehicleId)}/odometer-readings/${encodeURIComponent(readingId)}/verify`,
      undefined,
      { operation: 'vehicles.verifyOdometerReading' },
    )
  },

  deleteOdometerReading(vehicleId: string, readingId: string) {
    return api.delete<void>(`${byId(vehicleId)}/odometer-readings/${encodeURIComponent(readingId)}`, {
      operation: 'vehicles.deleteOdometerReading',
    })
  },

  /* ---------------- documents ---------------- */

  documents(vehicleId: string, signal?: AbortSignal) {
    return api.get<Document[]>(`${byId(vehicleId)}/documents`, {
      signal,
      operation: 'vehicles.documents',
    })
  },

  /**
   * Attaches a document. Takes `FormData` — the transport passes a non-JSON
   * body straight through and lets the browser set the multipart boundary.
   */
  addDocument(vehicleId: string, body: FormData) {
    return api.post<Document>(`${byId(vehicleId)}/documents`, body, {
      operation: 'vehicles.addDocument',
    })
  },

  removeDocument(vehicleId: string, documentId: string) {
    return api.delete<void>(`${byId(vehicleId)}/documents/${encodeURIComponent(documentId)}`, {
      operation: 'vehicles.removeDocument',
    })
  },

  /**
   * Resolves the download URL rather than fetching the bytes. Streaming a
   * file through the JSON client would buffer it in memory for no benefit —
   * hand the URL to an anchor and let the browser do the transfer.
   */
  documentDownloadUrl(vehicleId: string, documentId: string, signal?: AbortSignal) {
    return request<{ url: string }>({
      url: `${byId(vehicleId)}/documents/${encodeURIComponent(documentId)}/download`,
      signal,
      operation: 'vehicles.documentDownload',
    })
  },

  /* ---------------- reminders, warranty, insurance ---------------- */

  reminders(vehicleId: string, signal?: AbortSignal) {
    return api.get<Reminder[]>(`${byId(vehicleId)}/reminders`, {
      signal,
      operation: 'vehicles.reminders',
    })
  },

  warranty(vehicleId: string, signal?: AbortSignal) {
    return api.get<VehicleWarranty>(`${byId(vehicleId)}/warranty`, {
      signal,
      operation: 'vehicles.warranty',
    })
  },

  updateWarranty(vehicleId: string, input: VehicleWarranty) {
    return api.put<VehicleWarranty>(`${byId(vehicleId)}/warranty`, input, {
      operation: 'vehicles.updateWarranty',
    })
  },

  insurance(vehicleId: string, signal?: AbortSignal) {
    return api.get<VehicleInsurance>(`${byId(vehicleId)}/insurance`, {
      signal,
      operation: 'vehicles.insurance',
    })
  },

  updateInsurance(vehicleId: string, input: VehicleInsurance) {
    return api.put<VehicleInsurance>(`${byId(vehicleId)}/insurance`, input, {
      operation: 'vehicles.updateInsurance',
    })
  },

  /* ---------------- ownership & stats ---------------- */

  transferOwnership(vehicleId: string, input: TransferOwnershipInput) {
    return api.post<Vehicle>(`${byId(vehicleId)}/transfer`, input, {
      operation: 'vehicles.transferOwnership',
    })
  },

  stats(vehicleId: string, signal?: AbortSignal) {
    return api.get<VehicleStats>(`${byId(vehicleId)}/stats`, {
      signal,
      operation: 'vehicles.stats',
    })
  },
} as const
