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

/**
 * The dashboard's single query.
 *
 * Shorter stale time than the other reports: this is the screen people leave
 * open on a wall display, and it's cheap enough to keep current. Refetches on
 * focus via the client-wide default, so returning to the tab shows today's
 * numbers rather than the ones from when it was opened.
 */
export function useDashboardOverview(days = 30, serviceCenterId?: string) {
  return useQuery({
    queryKey: [...queryKeys.reports.all, 'overview', { days, serviceCenterId }] as const,
    queryFn: ({ signal }) => reportService.overview(days, serviceCenterId, signal),
    staleTime: 60_000,
    // Keeps the current numbers on screen while a changed range loads, rather
    // than collapsing six KPI tiles to skeletons on every filter click.
    placeholderData: keepPreviousData,
  })
}

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
