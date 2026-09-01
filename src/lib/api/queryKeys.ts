/**
 * Query key factory.
 *
 * Keys are hierarchical arrays so invalidation can target a level:
 *
 *   queryKeys.vehicles.all          ['vehicles']              → everything
 *   queryKeys.vehicles.lists()      ['vehicles','list']       → every list/filter
 *   queryKeys.vehicles.list({q})    ['vehicles','list',{q}]   → one filter
 *   queryKeys.vehicles.detail(id)   ['vehicles','detail',id]  → one record
 *   queryKeys.vehicles.documents(id)                          → one sub-resource
 *
 * Centralising them is what keeps invalidation correct as the surface grows
 * past a couple of hundred endpoints. Hand-written keys drift — one file
 * writes `['vehicles']` and another `['vehicle']`, and an invalidation
 * silently matches nothing. That failure is invisible: no error, no warning,
 * just stale data on screen.
 *
 * Sub-resource keys are nested *under* their parent's detail key on purpose,
 * so invalidating a vehicle also invalidates its documents and reminders
 * without those having to be listed anywhere.
 *
 * `as const` throughout, so keys are literal tuples and a typo in a level name
 * is a compile error rather than a cache miss.
 */

import type { QueryParams } from './types'

type Filters = QueryParams

export const queryKeys = {
  /* ---------------- identity ---------------- */
  session: {
    all: ['session'] as const,
    me: () => [...queryKeys.session.all, 'me'] as const,
    onboardingStatus: () => [...queryKeys.session.all, 'onboarding-status'] as const,
  },

  tenant: {
    all: ['tenant'] as const,
    me: () => [...queryKeys.tenant.all, 'me'] as const,
  },

  accounts: {
    all: ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.accounts.lists(), filters] as const,
    details: () => [...queryKeys.accounts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
    permissions: (id: string) => [...queryKeys.accounts.detail(id), 'permissions'] as const,
  },

  /* ---------------- fleet ---------------- */
  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.vehicles.lists(), filters] as const,
    search: (term: string) => [...queryKeys.vehicles.all, 'search', term] as const,
    byRegistration: (registration: string) =>
      [...queryKeys.vehicles.all, 'by-registration', registration] as const,
    byVin: (vin: string) => [...queryKeys.vehicles.all, 'by-vin', vin] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vehicles.details(), id] as const,
    serviceRecords: (id: string) => [...queryKeys.vehicles.detail(id), 'service-records'] as const,
    serviceCenters: (id: string) => [...queryKeys.vehicles.detail(id), 'service-centers'] as const,
    odometer: (id: string) => [...queryKeys.vehicles.detail(id), 'odometer'] as const,
    odometerHistory: (id: string) => [...queryKeys.vehicles.detail(id), 'odometer', 'history'] as const,
    odometerReadings: (id: string, filters: Filters = {}) =>
      [...queryKeys.vehicles.detail(id), 'odometer-readings', filters] as const,
    odometerReading: (id: string, readingId: string) =>
      [...queryKeys.vehicles.detail(id), 'odometer-readings', 'detail', readingId] as const,
    documents: (id: string) => [...queryKeys.vehicles.detail(id), 'documents'] as const,
    reminders: (id: string) => [...queryKeys.vehicles.detail(id), 'reminders'] as const,
    warranty: (id: string) => [...queryKeys.vehicles.detail(id), 'warranty'] as const,
    insurance: (id: string) => [...queryKeys.vehicles.detail(id), 'insurance'] as const,
    stats: (id: string) => [...queryKeys.vehicles.detail(id), 'stats'] as const,
  },

  /* ---------------- operations ---------------- */
  serviceRecords: {
    all: ['service-records'] as const,
    lists: () => [...queryKeys.serviceRecords.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.serviceRecords.lists(), filters] as const,
    details: () => [...queryKeys.serviceRecords.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.serviceRecords.details(), id] as const,
    parts: (id: string) => [...queryKeys.serviceRecords.detail(id), 'parts'] as const,
    labor: (id: string) => [...queryKeys.serviceRecords.detail(id), 'labor'] as const,
    documents: (id: string) => [...queryKeys.serviceRecords.detail(id), 'documents'] as const,
    invoice: (id: string) => [...queryKeys.serviceRecords.detail(id), 'invoice'] as const,
    feedback: (id: string) => [...queryKeys.serviceRecords.detail(id), 'feedback'] as const,
    nextService: (id: string) => [...queryKeys.serviceRecords.detail(id), 'next-service'] as const,
  },

  reminders: {
    all: ['reminders'] as const,
    lists: () => [...queryKeys.reminders.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.reminders.lists(), filters] as const,
    upcoming: (filters: Filters = {}) => [...queryKeys.reminders.all, 'upcoming', filters] as const,
    overdue: (filters: Filters = {}) => [...queryKeys.reminders.all, 'overdue', filters] as const,
    detail: (id: string) => [...queryKeys.reminders.all, 'detail', id] as const,
  },

  serviceCenters: {
    all: ['service-centers'] as const,
    lists: () => [...queryKeys.serviceCenters.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.serviceCenters.lists(), filters] as const,
    nearby: (filters: Filters = {}) => [...queryKeys.serviceCenters.all, 'nearby', filters] as const,
    details: () => [...queryKeys.serviceCenters.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.serviceCenters.details(), id] as const,
    vehicles: (id: string) => [...queryKeys.serviceCenters.detail(id), 'vehicles'] as const,
    staff: (id: string) => [...queryKeys.serviceCenters.detail(id), 'staff'] as const,
    services: (id: string) => [...queryKeys.serviceCenters.detail(id), 'services'] as const,
    stats: (id: string) => [...queryKeys.serviceCenters.detail(id), 'stats'] as const,
    reviews: (id: string) => [...queryKeys.serviceCenters.detail(id), 'reviews'] as const,
    documents: (id: string) => [...queryKeys.serviceCenters.detail(id), 'documents'] as const,
    settings: (id: string) => [...queryKeys.serviceCenters.detail(id), 'settings'] as const,
  },

  /* ---------------- people ---------------- */
  staff: {
    all: ['staff'] as const,
    lists: () => [...queryKeys.staff.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.staff.lists(), filters] as const,
    details: () => [...queryKeys.staff.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.staff.details(), id] as const,
    permissions: (id: string) => [...queryKeys.staff.detail(id), 'permissions'] as const,
    schedule: (id: string) => [...queryKeys.staff.detail(id), 'schedule'] as const,
    performance: (id: string) => [...queryKeys.staff.detail(id), 'performance'] as const,
    services: (id: string) => [...queryKeys.staff.detail(id), 'services'] as const,
  },

  owners: {
    all: ['owners'] as const,
    lists: () => [...queryKeys.owners.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.owners.lists(), filters] as const,
    details: () => [...queryKeys.owners.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.owners.details(), id] as const,
    vehicles: (id: string) => [...queryKeys.owners.detail(id), 'vehicles'] as const,
    serviceHistory: (id: string) => [...queryKeys.owners.detail(id), 'service-history'] as const,
    expenses: (id: string) => [...queryKeys.owners.detail(id), 'expenses'] as const,
    notifications: (id: string) => [...queryKeys.owners.detail(id), 'notifications'] as const,
    preferences: (id: string) => [...queryKeys.owners.detail(id), 'preferences'] as const,
  },

  invitations: {
    all: ['invitations'] as const,
    lists: () => [...queryKeys.invitations.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.invitations.lists(), filters] as const,
    mine: () => [...queryKeys.invitations.all, 'mine'] as const,
    detail: (id: string) => [...queryKeys.invitations.all, 'detail', id] as const,
    validate: (token: string) => [...queryKeys.invitations.all, 'validate', token] as const,
  },

  /* ---------------- access control ---------------- */
  roles: {
    all: ['roles'] as const,
    lists: () => [...queryKeys.roles.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.roles.lists(), filters] as const,
    details: () => [...queryKeys.roles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.roles.details(), id] as const,
    permissions: (id: string) => [...queryKeys.roles.detail(id), 'permissions'] as const,
  },

  permissions: {
    all: ['permissions'] as const,
    lists: () => [...queryKeys.permissions.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.permissions.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.permissions.all, 'detail', id] as const,
  },

  /* ---------------- business ---------------- */
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.invoices.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.invoices.all, 'detail', id] as const,
  },

  payments: {
    all: ['payments'] as const,
    lists: () => [...queryKeys.payments.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.payments.lists(), filters] as const,
    mine: (filters: Filters = {}) => [...queryKeys.payments.all, 'mine', filters] as const,
    stats: () => [...queryKeys.payments.all, 'stats'] as const,
    detail: (id: string) => [...queryKeys.payments.all, 'detail', id] as const,
  },

  subscriptions: {
    all: ['subscriptions'] as const,
    mine: () => [...queryKeys.subscriptions.all, 'mine'] as const,
  },

  subscriptionPlans: {
    all: ['subscription-plans'] as const,
    lists: () => [...queryKeys.subscriptionPlans.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.subscriptionPlans.lists(), filters] as const,
    public: () => [...queryKeys.subscriptionPlans.all, 'public'] as const,
    compare: () => [...queryKeys.subscriptionPlans.all, 'compare'] as const,
    detail: (id: string) => [...queryKeys.subscriptionPlans.all, 'detail', id] as const,
    bySlug: (slug: string) => [...queryKeys.subscriptionPlans.all, 'slug', slug] as const,
  },

  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.documents.lists(), filters] as const,
    byEntity: (entityType: string, entityId: string) =>
      [...queryKeys.documents.all, 'entity', entityType, entityId] as const,
    detail: (id: string) => [...queryKeys.documents.all, 'detail', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.notifications.lists(), filters] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    stats: () => [...queryKeys.notifications.all, 'stats'] as const,
    detail: (id: string) => [...queryKeys.notifications.all, 'detail', id] as const,
  },

  reports: {
    all: ['reports'] as const,
    dashboard: (filters: Filters = {}) => [...queryKeys.reports.all, 'dashboard', filters] as const,
    serviceCenter: (report: string, filters: Filters = {}) =>
      [...queryKeys.reports.all, 'service-center', report, filters] as const,
    owner: (report: string, filters: Filters = {}) =>
      [...queryKeys.reports.all, 'owner', report, filters] as const,
    admin: (report: string, filters: Filters = {}) =>
      [...queryKeys.reports.all, 'admin', report, filters] as const,
  },

  /* ---------------- platform administration ---------------- */
  admin: {
    all: ['admin'] as const,
    dashboard: () => [...queryKeys.admin.all, 'dashboard'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    tenants: (filters: Filters = {}) => [...queryKeys.admin.all, 'tenants', filters] as const,
    pendingTenants: () => [...queryKeys.admin.all, 'tenants', 'pending'] as const,
    tenant: (id: string) => [...queryKeys.admin.all, 'tenants', 'detail', id] as const,
    users: (filters: Filters = {}) => [...queryKeys.admin.all, 'users', filters] as const,
    systemHealth: () => [...queryKeys.admin.all, 'system', 'health'] as const,
    systemLogs: (filters: Filters = {}) => [...queryKeys.admin.all, 'system', 'logs', filters] as const,
    systemMetrics: () => [...queryKeys.admin.all, 'system', 'metrics'] as const,
  },

  auditLogs: {
    all: ['audit-logs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (filters: Filters = {}) => [...queryKeys.auditLogs.lists(), filters] as const,
    summary: (filters: Filters = {}) => [...queryKeys.auditLogs.all, 'summary', filters] as const,
    byEntity: (entityType: string, entityId: string) =>
      [...queryKeys.auditLogs.all, 'entity', entityType, entityId] as const,
    byActor: (actorId: string, filters: Filters = {}) =>
      [...queryKeys.auditLogs.all, 'actor', actorId, filters] as const,
    detail: (id: string) => [...queryKeys.auditLogs.all, 'detail', id] as const,
  },

  /* ---------------- unauthenticated ---------------- */
  public: {
    all: ['public'] as const,
    info: () => [...queryKeys.public.all, 'info'] as const,
    version: () => [...queryKeys.public.all, 'version'] as const,
    serviceCenters: (filters: Filters = {}) =>
      [...queryKeys.public.all, 'service-centers', filters] as const,
    serviceCenter: (id: string) => [...queryKeys.public.all, 'service-centers', 'detail', id] as const,
    serviceCenterReviews: (id: string) =>
      [...queryKeys.public.all, 'service-centers', 'detail', id, 'reviews'] as const,
  },
} as const
