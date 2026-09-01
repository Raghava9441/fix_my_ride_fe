import type { Address, BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'

/* ---------------- tenants ---------------- */

export type TenantStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'
export type TenantApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface TenantLimits {
  maxVehicles: number
  maxStaff: number
  maxServiceCenters: number
  maxStorageGB: number
  maxApiCallsPerMonth: number
}

export interface TenantSettings {
  enableMfa: boolean
  requireEmailVerification: boolean
  allowSignups: boolean
  sessionTimeoutMinutes: number
  passwordPolicy?: {
    minLength: number
    requireUppercase: boolean
    [key: string]: unknown
  }
}

export interface Tenant extends BaseDocument {
  name: string
  slug: string
  description?: string
  logoUrl?: string
  website?: string
  contactEmail: string
  contactPhone?: string
  address?: Address & { timezone?: string; currency?: string }
  subscription?: {
    planId?: Id
    status: TenantStatus
    startedAt: IsoDate
    expiresAt?: IsoDate
    trialEndsAt?: IsoDate
  }
  limits?: TenantLimits
  features?: string[]
  settings?: TenantSettings
  approvalStatus?: TenantApprovalStatus
}

export interface TenantListFilters extends ListParams {
  status?: TenantStatus
  approvalStatus?: TenantApprovalStatus
  [key: string]: string | number | boolean | undefined
}

export interface CreateTenantInput {
  name: string
  slug?: string
  contactEmail: string
  contactPhone?: string
  description?: string
}

export type UpdateTenantInput = Partial<CreateTenantInput> & {
  settings?: Partial<TenantSettings>
  limits?: Partial<TenantLimits>
}

/* ---------------- system ---------------- */

export interface AdminDashboard {
  [key: string]: unknown
}

export interface SystemHealth {
  status?: string
  uptime?: number
  database?: { status?: string; latencyMs?: number }
  redis?: { status?: string; latencyMs?: number }
  [key: string]: unknown
}

export interface SystemMetrics {
  [key: string]: unknown
}

export interface SystemLogEntry {
  timestamp: IsoDate
  level: string
  message: string
  [key: string]: unknown
}

/* ---------------- audit ---------------- */

export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'GRANT_ACCESS'
  | 'REVOKE_ACCESS'

export type AuditEntityType =
  | 'Vehicle'
  | 'ServiceRecord'
  | 'Account'
  | 'OwnerProfile'
  | 'StaffProfile'
  | 'ServiceCenter'
  | 'Tenant'
  | 'System'

export interface AuditLog extends BaseDocument {
  tenantId?: Id
  actorId: Id
  actorRole?: 'owner' | 'staff' | 'admin' | 'system'
  actorEmail?: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: Id
  changes?: Array<{ field?: string; oldValue?: unknown; newValue?: unknown }>
  ipAddress?: string
  userAgent?: string
  recordedAt: IsoDate
}

export interface AuditLogFilters extends ListParams {
  action?: AuditAction
  entityType?: AuditEntityType
  actorId?: Id
  from?: IsoDate
  to?: IsoDate
  [key: string]: string | number | boolean | undefined
}

export interface AuditSummary {
  [key: string]: unknown
}
