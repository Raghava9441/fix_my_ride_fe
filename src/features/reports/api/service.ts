import { api, type QueryParams } from '@/lib/api'
import type {
  AdminReport,
  DashboardOverview,
  ExportReportInput,
  ExportReportResult,
  OwnerReport,
  ReportFilters,
  ReportResult,
  ServiceCenterReport,
} from '../types'

/**
 * Report API service — all 17 endpoints under `/api/v1/reports`.
 *
 * The backend groups them by audience in the path (`/service-center/*`,
 * `/owner/*`, `/admin/*`), and that grouping is mirrored here as three
 * functions taking a report name rather than seventeen near-identical
 * methods. The union types keep the name checked at compile time, so a typo
 * is an error rather than a 404 at runtime.
 *
 * Note: those path prefixes are naming convention only. The backend gates
 * every report on `authenticate` alone — `/admin/*` reports are not
 * admin-gated server-side, so the access rules on these screens are a UX
 * contract, not enforcement.
 *
 * Reports get a longer timeout: several aggregate over the full history of a
 * tenant and legitimately take longer than a CRUD round trip.
 */

const BASE = '/reports'
const REPORT_TIMEOUT_MS = 60_000

export const reportService = {
  /**
   * Everything the dashboard renders, in one request.
   *
   * Deliberately one call rather than six: a dashboard that fans out on mount
   * pays six times the latency and its tiles land at different moments, so the
   * page visibly reflows as each arrives. Scope (center / owner / platform) is
   * resolved server-side from the caller.
   */
  overview(days = 30, serviceCenterId?: string, signal?: AbortSignal): Promise<DashboardOverview> {
    return api.get<DashboardOverview>(`${BASE}/overview`, {
      params: { days, serviceCenterId },
      signal,
      timeoutMs: REPORT_TIMEOUT_MS,
      operation: 'reports.overview',
    })
  },

  dashboard(filters: ReportFilters = {}, signal?: AbortSignal): Promise<ReportResult> {
    return api.get<ReportResult>(`${BASE}/dashboard`, {
      params: filters as QueryParams,
      signal,
      timeoutMs: REPORT_TIMEOUT_MS,
      operation: 'reports.dashboard',
    })
  },

  serviceCenter(
    report: ServiceCenterReport,
    filters: ReportFilters = {},
    signal?: AbortSignal,
  ): Promise<ReportResult> {
    return api.get<ReportResult>(`${BASE}/service-center/${report}`, {
      params: filters as QueryParams,
      signal,
      timeoutMs: REPORT_TIMEOUT_MS,
      // Labelled by report name, not interpolated path, so each report is its
      // own bounded metric series.
      operation: `reports.serviceCenter.${report}`,
    })
  },

  owner(report: OwnerReport, filters: ReportFilters = {}, signal?: AbortSignal): Promise<ReportResult> {
    return api.get<ReportResult>(`${BASE}/owner/${report}`, {
      params: filters as QueryParams,
      signal,
      timeoutMs: REPORT_TIMEOUT_MS,
      operation: `reports.owner.${report}`,
    })
  },

  admin(report: AdminReport, filters: ReportFilters = {}, signal?: AbortSignal): Promise<ReportResult> {
    return api.get<ReportResult>(`${BASE}/admin/${report}`, {
      params: filters as QueryParams,
      signal,
      timeoutMs: REPORT_TIMEOUT_MS,
      operation: `reports.admin.${report}`,
    })
  },

  /**
   * Kicks off an export. Generating a file can take a while, so this gets the
   * long timeout too — and it is a POST, so the transport will not retry it.
   */
  export(input: ExportReportInput): Promise<ExportReportResult> {
    return api.post<ExportReportResult>(`${BASE}/export`, input, {
      timeoutMs: REPORT_TIMEOUT_MS,
      operation: 'reports.export',
    })
  },
} as const
