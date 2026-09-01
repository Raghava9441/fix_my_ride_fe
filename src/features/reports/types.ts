import type { Id, IsoDate } from '@/lib/api/domain'
import type { ServiceStatus, ServiceType } from '@/features/service-records/types'
import type { Reminder } from '@/features/reminders/types'

/* ------------------------------------------------------------------ */
/* Dashboard overview — GET /reports/overview                          */
/* ------------------------------------------------------------------ */

/**
 * A measure plus the same measure over the immediately preceding window of
 * equal length.
 *
 * `changePct` is `null` when the previous window was zero — a jump from
 * nothing is "new", not "+∞%", and the UI renders that as a dash rather than
 * inventing a percentage.
 */
export interface KpiDelta {
  value: number
  previous: number
  changePct: number | null
}

export interface OverviewKpis {
  revenue: KpiDelta
  jobs: KpiDelta
  customers: KpiDelta
  activeVehicles: KpiDelta
  /** Average repair order — the headline profitability metric for a shop. */
  averageRepairOrder: KpiDelta
  /** Percentage of jobs in the window that reached `completed`. */
  completionRate: KpiDelta
}

export interface RevenueTrendPoint {
  /** `YYYY-MM-DD`. Zero-filled server-side, so gaps are real zeros. */
  date: string
  revenue: number
  jobs: number
}

export interface JobsByStatus {
  status: ServiceStatus
  count: number
}

export interface JobsByType {
  serviceType: ServiceType
  count: number
  revenue: number
}

export interface OverviewServiceRecord {
  _id: Id
  serviceDate: IsoDate
  serviceType: ServiceType
  status: ServiceStatus
  description?: string
  cost?: { total?: number; currency?: string }
  vehicleId?:
    | Id
    | { _id: Id; registrationNumber?: string; make?: string; model?: string; year?: number }
}

/**
 * Which dashboard the server decided to render, resolved from the caller
 * rather than requested by the client. `none` means the account has neither a
 * staff nor an owner profile — a valid empty payload, not an error.
 */
export type OverviewScope = 'center' | 'owner' | 'platform' | 'none'

export interface DashboardOverview {
  scope: OverviewScope
  generatedAt: IsoDate
  period: { days: number; start: IsoDate; end: IsoDate }
  /** Sourced from the underlying records, so totals and rows agree. */
  currency?: string
  kpis: OverviewKpis | null
  revenueTrend: RevenueTrendPoint[]
  jobsByStatus: JobsByStatus[]
  jobsByType: JobsByType[]
  recentServiceRecords: OverviewServiceRecord[]
  reminders: { upcoming: Reminder[]; overdueCount: number }
  /** Platform scope only. */
  tenants?: number
}

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
