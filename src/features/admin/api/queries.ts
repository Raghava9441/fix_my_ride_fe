import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { adminService, auditService } from './service'
import type { AuditLogFilters, TenantListFilters } from '../types'

/* ---------------- overview ---------------- */

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: ({ signal }) => adminService.dashboard(signal),
    staleTime: 60_000,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: ({ signal }) => adminService.stats(signal),
    staleTime: 60_000,
  })
}

/* ---------------- tenants ---------------- */

export function useAdminTenants(filters: TenantListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.admin.tenants(filters),
    queryFn: ({ signal }) => adminService.tenants(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function usePendingTenants() {
  return useQuery({
    queryKey: queryKeys.admin.pendingTenants(),
    queryFn: ({ signal }) => adminService.pendingTenants(signal),
    // The approval queue is the one admin list that is genuinely a work
    // queue, so it stays fresher than the rest.
    staleTime: 30_000,
  })
}

export function useAdminTenant(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.tenant(id ?? ''),
    queryFn: ({ signal }) => adminService.tenant(id!, signal),
    enabled: Boolean(id),
  })
}

/* ---------------- users ---------------- */

export function useAdminUsers(filters: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: ({ signal }) => adminService.users(filters, signal),
    placeholderData: keepPreviousData,
  })
}

/* ---------------- system ---------------- */

/**
 * System health polls, because it is the one screen whose entire purpose is
 * to show what is true *now*. Background polling stays off so a forgotten
 * open tab doesn't keep hitting the endpoint.
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.admin.systemHealth(),
    queryFn: ({ signal }) => adminService.systemHealth(signal),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  })
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: queryKeys.admin.systemMetrics(),
    queryFn: ({ signal }) => adminService.systemMetrics(signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useSystemLogs(filters: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.admin.systemLogs(filters),
    queryFn: ({ signal }) => adminService.systemLogs(filters, signal),
    placeholderData: keepPreviousData,
  })
}

/* ---------------- audit ---------------- */

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters),
    queryFn: ({ signal }) => auditService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAuditSummary(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs.summary(filters),
    queryFn: ({ signal }) => auditService.summary(filters, signal),
    staleTime: 5 * 60_000,
  })
}

/**
 * The audit trail for one record — "who changed this and when".
 *
 * Audit entries are append-only and never mutate, so once fetched they are
 * valid indefinitely; the long stale time reflects that rather than being a
 * guess.
 */
export function useEntityAuditLogs(
  entityType: string | undefined,
  entityId: string | undefined,
  filters: QueryParams = {},
) {
  return useQuery({
    queryKey: [...queryKeys.auditLogs.byEntity(entityType ?? '', entityId ?? ''), filters] as const,
    queryFn: ({ signal }) => auditService.byEntity(entityType!, entityId!, filters, signal),
    enabled: Boolean(entityType && entityId),
    staleTime: 5 * 60_000,
  })
}

export function useActorAuditLogs(actorId: string | undefined, filters: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.auditLogs.byActor(actorId ?? '', filters),
    queryFn: ({ signal }) => auditService.byActor(actorId!, filters, signal),
    enabled: Boolean(actorId),
    staleTime: 5 * 60_000,
  })
}

export function useAuditLog(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auditLogs.detail(id ?? ''),
    queryFn: ({ signal }) => auditService.get(id!, signal),
    enabled: Boolean(id),
    // Immutable once written.
    staleTime: Infinity,
  })
}
