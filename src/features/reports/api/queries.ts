import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { reportService } from './service'
import type { AdminReport, OwnerReport, ReportFilters, ServiceCenterReport } from '../types'

/**
 * Reports are expensive to compute and describe a period that has already
 * happened, so they stay fresh far longer than transactional data. Refetching
 * last quarter's revenue every thirty seconds costs the backend real work to
 * return the identical numbers.
 */
const REPORT_STALE_TIME = 5 * 60_000

export function useDashboardReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.dashboard(filters),
    queryFn: ({ signal }) => reportService.dashboard(filters, signal),
    staleTime: REPORT_STALE_TIME,
  })
}

export function useServiceCenterReport(report: ServiceCenterReport, filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.serviceCenter(report, filters),
    queryFn: ({ signal }) => reportService.serviceCenter(report, filters, signal),
    staleTime: REPORT_STALE_TIME,
    // Keeps the current chart rendered while a changed date range loads,
    // rather than collapsing the layout to a skeleton on every filter tweak.
    placeholderData: keepPreviousData,
  })
}

export function useOwnerReport(report: OwnerReport, filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.owner(report, filters),
    queryFn: ({ signal }) => reportService.owner(report, filters, signal),
    staleTime: REPORT_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}

export function useAdminReport(report: AdminReport, filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.admin(report, filters),
    queryFn: ({ signal }) => reportService.admin(report, filters, signal),
    staleTime: REPORT_STALE_TIME,
    placeholderData: keepPreviousData,
  })
}
