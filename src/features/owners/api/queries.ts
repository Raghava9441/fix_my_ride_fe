import { useCallback } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { ownerService } from './service'
import type { OwnerListFilters } from '../types'

export function useOwners(filters: OwnerListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.owners.list(filters),
    queryFn: ({ signal }) => ownerService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useOwner(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.owners.detail(id ?? ''),
    queryFn: ({ signal }) => ownerService.get(id!, signal),
    enabled: Boolean(id),
  })
}

export function useOwnerVehicles(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.owners.vehicles(id ?? ''), filters] as const,
    queryFn: ({ signal }) => ownerService.vehicles(id!, filters, signal),
    enabled: Boolean(id),
  })
}

export function useOwnerServiceHistory(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.owners.serviceHistory(id ?? ''), filters] as const,
    queryFn: ({ signal }) => ownerService.serviceHistory(id!, filters, signal),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  })
}

export function useOwnerExpenses(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.owners.expenses(id ?? ''), filters] as const,
    queryFn: ({ signal }) => ownerService.expenses(id!, filters, signal),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}

export function useOwnerNotifications(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.owners.notifications(id ?? ''), filters] as const,
    queryFn: ({ signal }) => ownerService.notifications(id!, filters, signal),
    enabled: Boolean(id),
  })
}

export function useOwnerPreferences(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.owners.preferences(id ?? ''),
    queryFn: ({ signal }) => ownerService.preferences(id!, signal),
    enabled: Boolean(id),
  })
}

/**
 * Warms a customer's detail cache from the list, on hover or focus.
 *
 * `staleTime` is what makes this worth doing: without it the detail screen
 * refetches on mount anyway and the prefetch is pure extra load. A minute is
 * long enough to cover the gap between pointing at a row and arriving on the
 * screen, and short enough that a record edited elsewhere is not shown stale
 * for long.
 */
export function usePrefetchOwner() {
  const queryClient = useQueryClient()

  return useCallback(
    (ownerId: string) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.owners.detail(ownerId),
        queryFn: ({ signal }) => ownerService.get(ownerId, signal),
        staleTime: 60_000,
      })
    },
    [queryClient],
  )
}
