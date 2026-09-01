import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { publicService } from './service'

/**
 * Public content is the same for every visitor and changes rarely, so it gets
 * the longest freshness window in the app. It is also the first thing an
 * anonymous visitor loads, which makes it the place where an unnecessary
 * refetch is most visible.
 */
const PUBLIC_STALE_TIME = 15 * 60_000

export function usePublicInfo() {
  return useQuery({
    queryKey: queryKeys.public.info(),
    queryFn: ({ signal }) => publicService.info(signal),
    staleTime: PUBLIC_STALE_TIME,
  })
}

export function usePublicVersion() {
  return useQuery({
    queryKey: queryKeys.public.version(),
    queryFn: ({ signal }) => publicService.version(signal),
    staleTime: PUBLIC_STALE_TIME,
  })
}

export function usePublicServiceCenters(filters: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.public.serviceCenters(filters),
    queryFn: ({ signal }) => publicService.serviceCenters(filters, signal),
    staleTime: PUBLIC_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function usePublicServiceCenter(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.public.serviceCenter(id ?? ''),
    queryFn: ({ signal }) => publicService.serviceCenter(id!, signal),
    enabled: Boolean(id),
    staleTime: PUBLIC_STALE_TIME,
  })
}

export function usePublicServiceCenterReviews(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.public.serviceCenterReviews(id ?? ''), filters] as const,
    queryFn: ({ signal }) => publicService.serviceCenterReviews(id!, filters, signal),
    enabled: Boolean(id),
    staleTime: PUBLIC_STALE_TIME,
  })
}
