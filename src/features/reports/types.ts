import type { Id, IsoDate } from '@/lib/api/domain'

/**
 * Reports return aggregate shapes that vary per endpoint and are still in
 * flux server-side, so they're typed as an open record rather than guessed
 * field-by-field. A wrong concrete type here would be worse than an honest
 * loose one: it would compile, then break at runtime on a chart.
 *
 * Narrow these per report as the screens that consume them are built.
 */
export interface ReportResult {
  [key: string]: unknown
}

/** Filters every report accepts. */
export interface ReportFilters {
  from?: IsoDate
  to?: IsoDate
  serviceCenterId?: Id
  ownerId?: Id
  tenantId?: Id
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  [key: string]: string | number | boolean | undefined
}

export type ServiceCenterReport =
  | 'revenue'
  | 'vehicles'
  | 'services'
  | 'staff-performance'
  | 'customer-satisfaction'
  | 'parts-usage'

export type OwnerReport = 'expenses' | 'service-history' | 'upcoming-services' | 'maintenance-summary'

export type AdminReport = 'tenants' | 'revenue' | 'growth' | 'retention' | 'churn'

export interface ExportReportInput {
  report: string
  format: 'csv' | 'xlsx' | 'pdf'
  filters?: ReportFilters
}

export interface ExportReportResult {
  /** URL to fetch the generated file from, or a job id when async. */
  url?: string
  jobId?: string
}
