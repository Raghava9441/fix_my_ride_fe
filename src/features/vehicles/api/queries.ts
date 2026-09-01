import { useCallback } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { vehicleService } from './service'
import type { VehicleListFilters } from '../types'

/**
 * Read hooks for vehicles.
 *
 * Every one forwards TanStack Query's `signal` into the service, which is what
 * makes a search race impossible:
 *
 *     "car" ─▶ "car service" ─▶ "car service near me"
 *
 * Each keystroke changes the query key, Query aborts the superseded request's
 * signal, and the transport cancels the fetch. An older response cannot arrive
 * late and overwrite a newer one, because it never completes — and Query would
 * discard a result for a key that is no longer active regardless.
 */

export function useVehicles(filters: VehicleListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(filters),
    queryFn: ({ signal }) => vehicleService.list(filters, signal),
    // Keeps the current page on screen while the next loads, instead of
    // flashing an empty table between pages.
    placeholderData: keepPreviousData,
  })
}

export function useVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.get(vehicleId!, signal),
    // Without this a detail route renders once with an undefined param and
    // fires `GET /vehicles/undefined` before the router resolves it.
    enabled: Boolean(vehicleId),
    staleTime: 60_000,
  })
}

/**
 * Search-as-you-type. Callers pass an already-debounced term: the delay is a
 * UI decision, while making sure the newest term wins is this layer's job.
 */
export function useVehicleSearch(term: string, { minLength = 2 }: { minLength?: number } = {}) {
  const trimmed = term.trim()

  return useQuery({
    queryKey: queryKeys.vehicles.search(trimmed),
    queryFn: ({ signal }) => vehicleService.search(trimmed, signal),
    enabled: trimmed.length >= minLength,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

export function useVehicleByRegistration(registrationNumber: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.byRegistration(registrationNumber ?? ''),
    queryFn: ({ signal }) => vehicleService.getByRegistration(registrationNumber!, signal),
    enabled: Boolean(registrationNumber),
  })
}

export function useVehicleByVin(vin: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.byVin(vin ?? ''),
    queryFn: ({ signal }) => vehicleService.getByVin(vin!, signal),
    enabled: Boolean(vin),
  })
}

/**
 * Infinite scrolling over the paginated list.
 *
 * Reads `hasNext` from the server's pagination metadata rather than guessing
 * from page size — a final page that happens to be exactly `limit` rows long
 * would otherwise produce one extra empty request every time.
 */
export function useInfiniteVehicles(filters: Omit<VehicleListFilters, 'page'> = {}, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.vehicles.list({ ...filters, limit: pageSize, infinite: true }),
    queryFn: ({ pageParam, signal }) =>
      vehicleService.list({ ...filters, page: pageParam, limit: pageSize }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasNext ? last.pagination.page + 1 : undefined),
    getPreviousPageParam: (first) =>
      first.pagination.hasPrevious ? first.pagination.page - 1 : undefined,
    // Caps retained pages. Without it, a long scroll keeps every page ever
    // loaded in memory *and* refetches all of them on every revalidation.
    maxPages: 5,
  })
}

/* ---------------- sub-resources ---------------- */

export function useVehicleServiceRecords(vehicleId: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.vehicles.serviceRecords(vehicleId ?? ''), filters] as const,
    queryFn: ({ signal }) => vehicleService.serviceRecords(vehicleId!, filters, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleServiceCenters(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.serviceCenters(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.serviceCenters(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleOdometer(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.odometer(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.odometer(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleOdometerHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.odometerHistory(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.odometerHistory(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleOdometerReadings(vehicleId: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.vehicles.odometerReadings(vehicleId ?? '', filters),
    queryFn: ({ signal }) => vehicleService.odometerReadings(vehicleId!, filters, signal),
    enabled: Boolean(vehicleId),
    placeholderData: keepPreviousData,
  })
}

export function useVehicleOdometerReading(vehicleId: string | undefined, readingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.odometerReading(vehicleId ?? '', readingId ?? ''),
    queryFn: ({ signal }) => vehicleService.odometerReading(vehicleId!, readingId!, signal),
    enabled: Boolean(vehicleId && readingId),
  })
}

export function useVehicleDocuments(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.documents(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.documents(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleReminders(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.reminders(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.reminders(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleWarranty(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.warranty(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.warranty(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleInsurance(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.insurance(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.insurance(vehicleId!, signal),
    enabled: Boolean(vehicleId),
  })
}

export function useVehicleStats(vehicleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicles.stats(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.stats(vehicleId!, signal),
    enabled: Boolean(vehicleId),
    staleTime: 5 * 60_000,
  })
}

/* ---------------- prefetch ---------------- */

/**
 * Warms a vehicle's detail cache — call on row hover/focus in a list. By the
 * time the click registers the request is usually already in flight or done,
 * so the detail screen renders with data instead of a skeleton.
 *
 * `prefetchQuery` is a no-op when the entry is already fresh, so hovering a
 * row repeatedly costs nothing.
 */
export function usePrefetchVehicle() {
  const queryClient = useQueryClient()

  return useCallback(
    (vehicleId: string) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.vehicles.detail(vehicleId),
        queryFn: ({ signal }) => vehicleService.get(vehicleId, signal),
        staleTime: 60_000,
      })
    },
    [queryClient],
  )
}
