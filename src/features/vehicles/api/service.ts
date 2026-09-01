import { api, request, type Page, type QueryParams } from '@/lib/api'
import type { Vehicle, VehicleListFilters, CreateVehicleInput, UpdateVehicleInput } from '../types'

/**
 * Vehicle API service.
 *
 * The feature's entire knowledge of the HTTP surface: paths, parameter
 * shapes, and response types. Nothing here knows about React, and nothing
 * here re-implements transport concerns — retry, auth, timeouts, and
 * telemetry all come from the shared client.
 *
 * This is the layer that makes the architecture hold at 500 endpoints. Each
 * feature owns one of these; the client stays a single file that none of them
 * modify.
 *
 * Every call carries a stable `operation` label. Metrics and logs are keyed on
 * it, so `/vehicles/abc123` and `/vehicles/def456` roll up into one
 * `vehicles.get` series instead of one series per vehicle — the
 * high-cardinality mistake that gets metrics dropped by the backend.
 */

const BASE = '/vehicles'

export const vehicleService = {
  /**
   * A page of vehicles.
   *
   * Returns the envelope's `meta.pagination` alongside the rows. The previous
   * client discarded `meta` entirely, which is why server-side pagination was
   * unreachable from the frontend despite the backend supporting it.
   */
  async list(filters: VehicleListFilters = {}, signal?: AbortSignal): Promise<Page<Vehicle>> {
    const response = await request<Vehicle[]>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'vehicles.list',
    })

    const items = response.data ?? []

    return {
      items,
      // Older deployments of this endpoint return a bare array with no
      // pagination meta. Synthesising a single-page descriptor keeps callers
      // from branching on which shape they got.
      pagination: response.meta?.pagination ?? {
        page: Number(filters.page ?? 1),
        limit: Number(filters.limit ?? items.length),
        total: items.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    }
  },

  get(vehicleId: string, signal?: AbortSignal): Promise<Vehicle> {
    return api.get<Vehicle>(`${BASE}/${encodeURIComponent(vehicleId)}`, {
      signal,
      operation: 'vehicles.get',
    })
  },

  search(term: string, signal?: AbortSignal): Promise<Vehicle[]> {
    return api.get<Vehicle[]>(`${BASE}/search`, {
      params: { q: term },
      signal,
      operation: 'vehicles.search',
    })
  },

  create(input: CreateVehicleInput): Promise<Vehicle> {
    // No `retry` flag: POST is non-idempotent and the transport refuses to
    // retry it automatically. A timeout here could mean the vehicle *was*
    // created, and a silent retry would register it twice.
    return api.post<Vehicle>(BASE, input, { operation: 'vehicles.create' })
  },

  update(vehicleId: string, input: UpdateVehicleInput): Promise<Vehicle> {
    return api.put<Vehicle>(`${BASE}/${encodeURIComponent(vehicleId)}`, input, {
      operation: 'vehicles.update',
    })
  },

  remove(vehicleId: string): Promise<void> {
    return api.delete<void>(`${BASE}/${encodeURIComponent(vehicleId)}`, {
      operation: 'vehicles.delete',
    })
  },
} as const
