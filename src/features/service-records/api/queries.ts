import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { queryKeys } from '@/lib/api'
import { serviceRecordService } from './service'
import type { ServiceRecordListFilters } from '../types'

export function useServiceRecords(filters: ServiceRecordListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.list(filters),
    queryFn: ({ signal }) => serviceRecordService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteServiceRecords(
  filters: Omit<ServiceRecordListFilters, 'page'> = {},
  pageSize = 20,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.serviceRecords.list({ ...filters, limit: pageSize, infinite: true }),
    queryFn: ({ pageParam, signal }) =>
      serviceRecordService.list({ ...filters, page: pageParam, limit: pageSize }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.hasNext ? last.pagination.page + 1 : undefined),
    maxPages: 5,
  })
}

export function useServiceRecord(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.detail(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.get(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceRecordParts(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.parts(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.parts(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceRecordLabor(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.labor(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.labor(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceRecordDocuments(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.documents(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.documents(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceRecordInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.invoice(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.invoice(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceRecordFeedback(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.feedback(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.feedback(id!, signal),
    enabled: Boolean(id),
  })
}

export function useServiceRecordNextService(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.serviceRecords.nextService(id ?? ''),
    queryFn: ({ signal }) => serviceRecordService.nextService(id!, signal),
    enabled: Boolean(id),
  })
}

/** Warms a record's detail cache — call on row hover in the list. */
export function usePrefetchServiceRecord() {
  const queryClient = useQueryClient()

  return useCallback(
    (id: string) => {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.serviceRecords.detail(id),
        queryFn: ({ signal }) => serviceRecordService.get(id, signal),
        staleTime: 60_000,
      })
    },
    [queryClient],
  )
}
