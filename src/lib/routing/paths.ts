/**
 * Every URL in the application, in one place, as literal types.
 *
 * Two rules make this scale:
 *
 *   1. **No route path is ever written as a string literal outside this
 *      file.** Links call `to.vehicleDetail(id)`; the route registry
 *      declares `path: ROUTE_PATHS.vehicleDetail`. Renaming a URL is a
 *      one-line change that the compiler propagates.
 *
 *   2. **Paths are absolute, and nesting is for layout only.** Route
 *      nesting in the registry composes *chrome* (which shell, which
 *      guard), never URL segments. That means you can read a full URL off
 *      one line here instead of reconstructing it from four levels of
 *      relative `path` fragments — and moving a screen under a different
 *      layout doesn't change its URL. React Router permits absolute child
 *      paths under a pathless layout route, which is exactly our shape.
 *
 * `buildPath` is type-safe against the template: passing the wrong param
 * name, or forgetting one, is a compile error rather than a `/vehicles/:id`
 * that ships to production.
 */

export const ROUTE_PATHS = {
  /* ---- unauthenticated ---- */
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  acceptInvitation: '/invitations/accept',
  onboarding: '/onboarding',

  /* ---- workspace ---- */
  root: '/',
  dashboard: '/dashboard',

  /* ---- vehicles ---- */
  vehicles: '/vehicles',
  vehicleNew: '/vehicles/new',
  vehicleDetail: '/vehicles/:vehicleId',
  vehicleServiceHistory: '/vehicles/:vehicleId/service-history',
  vehicleDocuments: '/vehicles/:vehicleId/documents',
  vehicleReminders: '/vehicles/:vehicleId/reminders',

  /* ---- service operations ---- */
  serviceRecords: '/service-records',
  serviceRecordDetail: '/service-records/:serviceRecordId',
  serviceQueue: '/service-queue',
  reminders: '/reminders',

  /* ---- service centers ---- */
  serviceCenters: '/service-centers',
  serviceCenterDetail: '/service-centers/:serviceCenterId',
  serviceCenterStaff: '/service-centers/:serviceCenterId/staff',
  serviceCenterSettings: '/service-centers/:serviceCenterId/settings',

  /* ---- people ---- */
  staff: '/staff',
  staffDetail: '/staff/:staffId',
  owners: '/owners',
  ownerDetail: '/owners/:ownerId',
  ownerVehicles: '/owners/:ownerId/vehicles',
  ownerServiceHistory: '/owners/:ownerId/service-history',
  ownerExpenses: '/owners/:ownerId/expenses',
  invitations: '/invitations',

  /* ---- business ---- */
  reports: '/reports',
  invoices: '/invoices',
  invoiceDetail: '/invoices/:invoiceId',
  payments: '/payments',
  subscription: '/subscription',
  subscriptionPlans: '/subscription/plans',
  documents: '/documents',
  notifications: '/notifications',

  /* ---- workspace administration (tenant-scoped) ---- */
  workspaceSettings: '/settings/workspace',
  roles: '/settings/roles',
  roleDetail: '/settings/roles/:roleId',
  permissions: '/settings/permissions',

  /* ---- personal ---- */
  profile: '/settings/profile',
  security: '/settings/security',
  appearance: '/settings/appearance',

  /* ---- platform administration (cross-tenant) ---- */
  admin: '/admin',
  adminTenants: '/admin/tenants',
  adminTenantDetail: '/admin/tenants/:tenantId',
  adminUsers: '/admin/users',
  adminSystem: '/admin/system',
  auditLog: '/admin/audit-log',
} as const

/*
 * There is deliberately no `/403` or `/404` path. A refused route renders
 * the denial in place so the URL stays shareable and the user can see which
 * screen they were turned away from; an unmatched URL is caught by the
 * shell's `*` route for the same reason. Redirecting to an error URL throws
 * away the only piece of information the page has to offer.
 */

export type RoutePathKey = keyof typeof ROUTE_PATHS
export type RoutePathTemplate = (typeof ROUTE_PATHS)[RoutePathKey]

/** Extracts `:param` names out of a path template as a string union. */
type PathParamNames<P extends string> = P extends `${string}:${infer Param}/${infer Rest}`
  ? Param | PathParamNames<`/${Rest}`>
  : P extends `${string}:${infer Param}`
    ? Param
    : never

export type PathParams<P extends string> = Record<PathParamNames<P>, string | number>

/**
 * Fills a path template. Templates with no params take no second argument;
 * templates with params require exactly their own names.
 */
export function buildPath<P extends string>(
  template: P,
  ...args: PathParamNames<P> extends never ? [] : [params: PathParams<P>]
): string {
  const params = args[0] as Record<string, string | number> | undefined
  if (!params) return template
  return template.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined || value === null || value === '') {
      throw new Error(`buildPath: missing "${name}" for template "${template}"`)
    }
    return encodeURIComponent(String(value))
  })
}

/** Appends a query string, dropping empty values so URLs stay clean. */
export function withQuery(path: string, query: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

/**
 * Builders for the parameterised routes. Static routes are referenced as
 * `ROUTE_PATHS.dashboard` directly — wrapping those in a function would add
 * a call for no type safety.
 */
export const to = {
  vehicleDetail: (vehicleId: string) => buildPath(ROUTE_PATHS.vehicleDetail, { vehicleId }),
  vehicleServiceHistory: (vehicleId: string) => buildPath(ROUTE_PATHS.vehicleServiceHistory, { vehicleId }),
  vehicleDocuments: (vehicleId: string) => buildPath(ROUTE_PATHS.vehicleDocuments, { vehicleId }),
  vehicleReminders: (vehicleId: string) => buildPath(ROUTE_PATHS.vehicleReminders, { vehicleId }),
  serviceRecordDetail: (serviceRecordId: string) =>
    buildPath(ROUTE_PATHS.serviceRecordDetail, { serviceRecordId }),
  serviceCenterDetail: (serviceCenterId: string) =>
    buildPath(ROUTE_PATHS.serviceCenterDetail, { serviceCenterId }),
  serviceCenterStaff: (serviceCenterId: string) =>
    buildPath(ROUTE_PATHS.serviceCenterStaff, { serviceCenterId }),
  serviceCenterSettings: (serviceCenterId: string) =>
    buildPath(ROUTE_PATHS.serviceCenterSettings, { serviceCenterId }),
  staffDetail: (staffId: string) => buildPath(ROUTE_PATHS.staffDetail, { staffId }),
  ownerDetail: (ownerId: string) => buildPath(ROUTE_PATHS.ownerDetail, { ownerId }),
  ownerVehicles: (ownerId: string) => buildPath(ROUTE_PATHS.ownerVehicles, { ownerId }),
  ownerServiceHistory: (ownerId: string) =>
    buildPath(ROUTE_PATHS.ownerServiceHistory, { ownerId }),
  ownerExpenses: (ownerId: string) => buildPath(ROUTE_PATHS.ownerExpenses, { ownerId }),
  invoiceDetail: (invoiceId: string) => buildPath(ROUTE_PATHS.invoiceDetail, { invoiceId }),
  roleDetail: (roleId: string) => buildPath(ROUTE_PATHS.roleDetail, { roleId }),
  adminTenantDetail: (tenantId: string) => buildPath(ROUTE_PATHS.adminTenantDetail, { tenantId }),

  /** Login, preserving where the user was headed. */
  loginWithReturn: (returnTo: string) =>
    returnTo && returnTo !== ROUTE_PATHS.root
      ? withQuery(ROUTE_PATHS.login, { next: returnTo })
      : ROUTE_PATHS.login,
} as const
