import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { staffService } from './service'
import type { StaffListFilters } from '../types'

export function useStaffList(filters: StaffListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.staff.list(filters),
    queryFn: ({ signal }) => staffService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useStaffMember(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.detail(id ?? ''),
    queryFn: ({ signal }) => staffService.get(id!, signal),
    enabled: Boolean(id),
  })
}

export function useStaffPermissions(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.permissions(id ?? ''),
    queryFn: ({ signal }) => staffService.permissions(id!, signal),
    enabled: Boolean(id),
  })
}

export function useStaffSchedule(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.schedule(id ?? ''),
    queryFn: ({ signal }) => staffService.schedule(id!, signal),
    enabled: Boolean(id),
  })
}

export function useStaffPerformance(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.staff.performance(id ?? ''), filters] as const,
    queryFn: ({ signal }) => staffService.performance(id!, filters, signal),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}

export function useStaffServices(id: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.staff.services(id ?? ''), filters] as const,
    queryFn: ({ signal }) => staffService.services(id!, filters, signal),
    enabled: Boolean(id),
  })
}
