import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { serviceCenterService } from './service'
import type { NearbyFilters, ServiceCenterListFilters } from '../types'

export function useServiceCenters(filters: ServiceCenterListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.list(filters),
    queryFn: ({ signal }) => serviceCenterService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

/**
 * Geo lookup. Coordinates should be quantised by the caller before they get
 * here — passing raw map-centre floats mints a new query key on every pixel
 * of pan and defeats the cache entirely.
 */
export function useNearbyServiceCenters(filters: NearbyFilters | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.nearby(filters as QueryParams),
    queryFn: ({ signal }) => serviceCenterService.nearby(filters!, signal),
    enabled: Boolean(filters),
    staleTime: 5 * 60_000,
  })
}

export function useServiceCenter(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.detail(id ?? ''),
    queryFn: ({ signal }) => serviceCenterService.get(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceCenterVehicles(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.serviceCenters.vehicles(id ?? ''), filters] as const,
    queryFn: ({ signal }) => serviceCenterService.vehicles(id!, filters, signal),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  })
}

export function useServiceCenterStaff(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.serviceCenters.staff(id ?? ''), filters] as const,
    queryFn: ({ signal }) => serviceCenterService.staff(id!, filters, signal),
    enabled: Boolean(id),
  })
}

export function useServiceCenterServices(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.services(id ?? ''),
    queryFn: ({ signal }) => serviceCenterService.services(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceCenterStats(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.stats(id ?? ''),
    queryFn: ({ signal }) => serviceCenterService.stats(id!, signal),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}

export function useServiceCenterReviews(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.serviceCenters.reviews(id ?? ''), filters] as const,
    queryFn: ({ signal }) => serviceCenterService.reviews(id!, filters, signal),
    enabled: Boolean(id),
  })
}

export function useServiceCenterDocuments(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.documents(id ?? ''),
    queryFn: ({ signal }) => serviceCenterService.documents(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceCenterSettings(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceCenters.settings(id ?? ''),
    queryFn: ({ signal }) => serviceCenterService.settings(id!, signal),
    enabled: Boolean(id),
  })
}
