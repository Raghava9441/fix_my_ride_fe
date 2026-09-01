import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type { Account } from '@/features/accounts/types'
import type {
  AdminDashboard,
  AuditLog,
  AuditLogFilters,
  AuditSummary,
  CreateTenantInput,
  SystemHealth,
  SystemLogEntry,
  SystemMetrics,
  Tenant,
  TenantListFilters,
  TenantStatus,
  UpdateTenantInput,
} from '../types'

/**
 * Platform administration — 21 endpoints under `/api/v1/admin` and 5 under
 * `/api/v1/audit-logs`.
 *
 * Both routers are genuinely gated server-side (`requireRole('admin')` on the
 * whole router), which makes this one of the few areas where the client's
 * access rules and the server's actually agree.
 */

const ADMIN = '/admin'
const AUDIT = '/audit-logs'

export const adminService = {
  dashboard(signal?: AbortSignal): Promise<AdminDashboard> {
    return api.get<AdminDashboard>(`${ADMIN}/dashboard`, { signal, operation: 'admin.dashboard' })
  },

  stats(signal?: AbortSignal): Promise<AdminDashboard> {
    return api.get<AdminDashboard>(`${ADMIN}/stats`, { signal, operation: 'admin.stats' })
  },

  /* ---------------- tenants ---------------- */

  tenants(filters: TenantListFilters = {}, signal?: AbortSignal): Promise<Page<Tenant>> {
    return fetchPage<Tenant>({
      url: `${ADMIN}/tenants`,
      params: filters as QueryParams,
      signal,
      operation: 'admin.tenants',
    })
  },

  pendingTenants(signal?: AbortSignal): Promise<Page<Tenant>> {
    return fetchPage<Tenant>({
      url: `${ADMIN}/tenants/pending`,
      signal,
      operation: 'admin.pendingTenants',
    })
  },

  tenant(id: string, signal?: AbortSignal): Promise<Tenant> {
    return api.get<Tenant>(`${ADMIN}/tenants/${encodeURIComponent(id)}`, {
      signal,
      operation: 'admin.tenant',
    })
  },

  createTenant(input: CreateTenantInput): Promise<Tenant> {
    return api.post<Tenant>(`${ADMIN}/tenants`, input, { operation: 'admin.createTenant' })
  },

  updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
    return api.put<Tenant>(`${ADMIN}/tenants/${encodeURIComponent(id)}`, input, {
      operation: 'admin.updateTenant',
    })
  },

  deleteTenant(id: string): Promise<void> {
    return api.delete<void>(`${ADMIN}/tenants/${encodeURIComponent(id)}`, {
      operation: 'admin.deleteTenant',
    })
  },

  updateTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
    return api.patch<Tenant>(`${ADMIN}/tenants/${encodeURIComponent(id)}/status`, { status }, {
      operation: 'admin.updateTenantStatus',
    })
  },

  approveTenant(id: string): Promise<Tenant> {
    return api.post<Tenant>(`${ADMIN}/tenants/${encodeURIComponent(id)}/approve`, undefined, {
      operation: 'admin.approveTenant',
    })
  },

  rejectTenant(id: string, reason?: string): Promise<Tenant> {
    return api.post<Tenant>(`${ADMIN}/tenants/${encodeURIComponent(id)}/reject`, { reason }, {
      operation: 'admin.rejectTenant',
    })
  },

  /* ---------------- users ---------------- */

  users(filters: QueryParams = {}, signal?: AbortSignal): Promise<Page<Account>> {
    return fetchPage<Account>({
      url: `${ADMIN}/users`,
      params: filters,
      signal,
      operation: 'admin.users',
    })
  },

  suspendUser(id: string, reason?: string): Promise<Account> {
    return api.patch<Account>(`${ADMIN}/users/${encodeURIComponent(id)}/suspend`, { reason }, {
      operation: 'admin.suspendUser',
    })
  },

  activateUser(id: string): Promise<Account> {
    return api.patch<Account>(`${ADMIN}/users/${encodeURIComponent(id)}/activate`, undefined, {
      operation: 'admin.activateUser',
    })
  },

  /* ---------------- system ---------------- */

  systemHealth(signal?: AbortSignal): Promise<SystemHealth> {
    return api.get<SystemHealth>(`${ADMIN}/system/health`, {
      signal,
      operation: 'admin.systemHealth',
    })
  },

  systemLogs(filters: QueryParams = {}, signal?: AbortSignal): Promise<Page<SystemLogEntry>> {
    return fetchPage<SystemLogEntry>({
      url: `${ADMIN}/system/logs`,
      params: filters,
      signal,
      operation: 'admin.systemLogs',
    })
  },

  systemMetrics(signal?: AbortSignal): Promise<SystemMetrics> {
    return api.get<SystemMetrics>(`${ADMIN}/system/metrics`, {
      signal,
      operation: 'admin.systemMetrics',
    })
  },

  /* ---------------- maintenance ----------------
   * Long-running and destructive. Each gets an extended timeout, and none is
   * ever retried — re-running a reindex or a backup because a response was
   * slow would double the load on an already-struggling system.
   */

  clearCache(): Promise<{ cleared: boolean }> {
    return api.post<{ cleared: boolean }>(`${ADMIN}/maintenance/clear-cache`, undefined, {
      timeoutMs: 60_000,
      operation: 'admin.clearCache',
    })
  },

  reindexSearch(): Promise<{ started: boolean }> {
    return api.post<{ started: boolean }>(`${ADMIN}/maintenance/reindex-search`, undefined, {
      timeoutMs: 120_000,
      operation: 'admin.reindexSearch',
    })
  },

  backup(): Promise<{ started: boolean }> {
    return api.post<{ started: boolean }>(`${ADMIN}/maintenance/backup`, undefined, {
      timeoutMs: 120_000,
      operation: 'admin.backup',
    })
  },

  /** `/admin/audit-logs` — the same data as the audit router, admin-scoped. */
  auditLogs(filters: AuditLogFilters = {}, signal?: AbortSignal): Promise<Page<AuditLog>> {
    return fetchPage<AuditLog>({
      url: `${ADMIN}/audit-logs`,
      params: filters as QueryParams,
      signal,
      operation: 'admin.auditLogs',
    })
  },
} as const

export const auditService = {
  list(filters: AuditLogFilters = {}, signal?: AbortSignal): Promise<Page<AuditLog>> {
    return fetchPage<AuditLog>({
      url: AUDIT,
      params: filters as QueryParams,
      signal,
      operation: 'audit.list',
    })
  },

  summary(filters: AuditLogFilters = {}, signal?: AbortSignal): Promise<AuditSummary> {
    return api.get<AuditSummary>(`${AUDIT}/summary`, {
      params: filters as QueryParams,
      signal,
      operation: 'audit.summary',
    })
  },

  byEntity(
    entityType: string,
    entityId: string,
    filters: QueryParams = {},
    signal?: AbortSignal,
  ): Promise<Page<AuditLog>> {
    return fetchPage<AuditLog>({
      url: `${AUDIT}/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      params: filters,
      signal,
      operation: 'audit.byEntity',
    })
  },

  byActor(actorId: string, filters: QueryParams = {}, signal?: AbortSignal): Promise<Page<AuditLog>> {
    return fetchPage<AuditLog>({
      url: `${AUDIT}/actor/${encodeURIComponent(actorId)}`,
      params: filters,
      signal,
      operation: 'audit.byActor',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<AuditLog> {
    return api.get<AuditLog>(`${AUDIT}/${encodeURIComponent(id)}`, {
      signal,
      operation: 'audit.get',
    })
  },
} as const
