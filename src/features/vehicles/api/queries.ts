import { useCallback } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { queryKeys, type Page } from '@/lib/api'
import type { ApiError } from '@/lib/api'
import { vehicleService } from './service'
import type { Vehicle, VehicleListFilters } from '../types'

/**
 * Read hooks for vehicles.
 *
 * Every one of them forwards TanStack Query's `signal` into the service, which
 * is what makes the search race in the brief impossible:
 *
 *     "car" ─▶ "car service" ─▶ "car service near me"
 *
 * Each keystroke changes the query key, Query aborts the superseded request's
 * signal, and the transport cancels the fetch. An older response cannot arrive
 * late and overwrite a newer one, because it never completes — and because
 * Query would discard a result for a key that is no longer active regardless.
 * The previous `useVehicles` ignored `signal` entirely, so every in-flight
 * request ran to completion whether or not anyone still wanted it.
 */

type VehicleListQueryOptions = Omit<
  UseQueryOptions<Page<Vehicle>, ApiError, Page<Vehicle>, ReturnType<typeof queryKeys.vehicles.list>>,
  'queryKey' | 'queryFn'
>

export function useVehicles(filters: VehicleListFilters = {}, options?: VehicleListQueryOptions) {
  return useQuery({
    queryKey: queryKeys.vehicles.list(filters),
    queryFn: ({ signal }) => vehicleService.list(filters, signal),

    /**
     * Keeps the previous page on screen while the next one loads, instead of
     * flashing an empty table between pages. Query marks the result
     * `isPlaceholderData`, so the UI can dim it rather than pretend it's
     * current.
     */
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useVehicle(vehicleId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.vehicles.detail(vehicleId ?? ''),
    queryFn: ({ signal }) => vehicleService.get(vehicleId!, signal),
    // Without this a detail route renders once with an undefined param and
    // fires `GET /vehicles/undefined` before the router resolves it.
    enabled: Boolean(vehicleId) && (options?.enabled ?? true),
    staleTime: 60_000,
  })
}

/**
 * Search-as-you-type.
 *
 * `enabled` on a minimum length rather than debouncing here: debouncing is a
 * UI concern (how long to wait after a keystroke) and belongs in the input,
 * while the query's job is to make sure whatever term is current is the one
 * that wins. Callers pass an already-debounced term.
 */
export function useVehicleSearch(term: string, { minLength = 2 }: { minLength?: number } = {}) {
  const trimmed = term.trim()

  return useQuery({
    queryKey: queryKeys.vehicles.list({ q: trimmed }),
    queryFn: ({ signal }) => vehicleService.search(trimmed, signal),
    enabled: trimmed.length >= minLength,
    // Search results go stale fast and are cheap to refetch; keeping them
    // fresh for 15s covers the common "type, backspace, retype" loop without
    // serving results for a term the user has moved past.
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Infinite scrolling over the same paginated endpoint.
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
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    getPreviousPageParam: (firstPage) =>
      firstPage.pagination.hasPrevious ? firstPage.pagination.page - 1 : undefined,

    /**
     * Caps retained pages. Without it, scrolling a long list keeps every page
     * ever loaded in memory *and* refetches all of them on every
     * revalidation — the classic infinite-scroll memory and bandwidth leak.
     */
    maxPages: 5,
  })
}

/**
 * Warms a vehicle's detail cache.
 *
 * Called on row hover/focus in the list. By the time the click registers the
 * request is usually already in flight or done, so the detail screen renders
 * with data instead of a skeleton. `prefetchQuery` is a no-op when the entry
 * is already fresh, so hovering a row repeatedly costs nothing.
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
