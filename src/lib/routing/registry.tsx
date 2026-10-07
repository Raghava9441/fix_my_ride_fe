import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import {
  BuildingIcon,
  CardIcon,
  ChartIcon,
  DashboardIcon,
  FolderIcon,
  InvoiceIcon,
  KeyIcon,
  ListIcon,
  MailIcon,
  PersonIcon,
  PlanIcon,
  QueueIcon,
  ReminderIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
  StaffIcon,
  VehicleIcon,
  WrenchIcon,
} from '@/components/icons'
import { access } from '../access/policy'
import { PERMISSIONS as P } from '../access/permissions'
import { ROUTE_PATHS } from './paths'
import type { AppRoute } from './types'

/**
 * The route manifest — the application's map.
 *
 * Every screen is declared exactly once, with everything any subsystem
 * needs to know about it: its URL, who may open it, what it's called, where
 * it sits in the navigation, and how to load it. The router, the side nav,
 * the breadcrumb trail, and the command palette are all *derived* from this
 * array. None of them keeps its own list, which is what stops a nav item
 * from outliving the screen it points at, or pointing at one the viewer
 * will be refused.
 *
 * ---- Conventions ----
 *
 * · Paths come from `ROUTE_PATHS` and are absolute. Nesting composes
 *   layout and access, never URL segments.
 * · `access` narrows as you descend — a child's rule is ANDed with its
 *   ancestors'. Declaring nothing inherits the parent's rule.
 * · Screens are lazy (`component`); layouts are eager (`element`).
 * · `nav` present ⇒ the route appears in the primary navigation, subject to
 *   the same access rule that guards it.
 *
 * ---- On what these rules actually buy ----
 *
 * The API enforces far less than this manifest describes: most endpoints are
 * gated only by "is there a valid token", with a handful checking a coarse
 * role. These rules keep people out of screens that would be empty, broken,
 * or confusing for them — they are not a security boundary, and the
 * server-side gaps need closing server-side. See lib/access/permissions.ts.
 */
export const routeManifest: AppRoute[] = [
  /* ================================================================
   * Signed-out entry points
   * ============================================================== */
  {
    id: 'auth',
    element: <AuthLayout />,
    access: access.anonymous(),
    breadcrumb: false,
    children: [
      {
        id: 'auth.login',
        path: ROUTE_PATHS.login,
        title: 'Sign in',
        component: () => import('@/features/auth/LoginPage'),
        keywords: ['sign in', 'log in'],
      },
      {
        id: 'auth.register',
        path: ROUTE_PATHS.register,
        title: 'Create account',
        component: () => import('@/features/auth/RegisterPage'),
      },
      {
        id: 'auth.forgotPassword',
        path: ROUTE_PATHS.forgotPassword,
        title: 'Reset password',
        component: () => import('@/features/auth/ForgotPasswordPage'),
      },
      {
        id: 'onboarding',
        path: ROUTE_PATHS.onboarding,
        title: 'Set up your workspace',
        component: () => import('@/features/onboarding/OnboardingPage'),
      },
    ],
  },

  /*
   * Reachable signed in *or* out: these are all entered from an emailed
   * link, and bouncing an already-signed-in user away from their own
   * verification link would be the wrong behaviour.
   */
  {
    id: 'authPublic',
    element: <AuthLayout />,
    access: access.public(),
    breadcrumb: false,
    children: [
      {
        id: 'auth.resetPassword',
        path: ROUTE_PATHS.resetPassword,
        title: 'Choose a new password',
        component: () => import('@/features/auth/ResetPasswordPage'),
      },
      {
        id: 'auth.verifyEmail',
        path: ROUTE_PATHS.verifyEmail,
        title: 'Verify email',
        component: () => import('@/features/auth/VerifyEmailPage'),
      },
      {
        id: 'auth.acceptInvitation',
        path: ROUTE_PATHS.acceptInvitation,
        title: 'Accept invitation',
        component: () => import('@/features/auth/AcceptInvitationPage'),
      },
    ],
  },

  /* ================================================================
   * The workspace — everything behind a session
   * ============================================================== */
  {
    id: 'app',
    element: <AppShell />,
    access: access.authenticated(),
    breadcrumb: false,
    children: [
      {
        id: 'app.index',
        index: true,
        component: () => import('@/features/dashboard/DashboardRedirect'),
        breadcrumb: false,
      },
      {
        id: 'dashboard',
        path: ROUTE_PATHS.dashboard,
        title: 'Dashboard',
        component: () => import('@/features/dashboard/DashboardPage'),
        nav: { label: 'Dashboard', icon: DashboardIcon, section: 'overview', order: 10 },
        keywords: ['home', 'overview', 'summary'],
      },

      /* ---------------- Operations ---------------- */
      {
        id: 'vehicles',
        path: ROUTE_PATHS.vehicles,
        title: 'Vehicles',
        access: access.permission(P.vehicle.read),
        component: () => import('@/features/vehicles/VehiclesPage'),
        nav: { label: 'Vehicles', icon: VehicleIcon, section: 'operations', order: 10 },
        keywords: ['cars', 'fleet', 'registration', 'vin'],
      },
      {
        id: 'vehicles.new',
        path: ROUTE_PATHS.vehicleNew,
        title: 'Add vehicle',
        breadcrumb: 'Add vehicle',
        access: access.permission(P.vehicle.create),
        component: () => import('@/features/vehicles/VehicleCreatePage'),
        keywords: ['new vehicle', 'register vehicle'],
      },
      {
        id: 'vehicles.detail',
        path: ROUTE_PATHS.vehicleDetail,
        title: 'Vehicle',
        access: access.permission(P.vehicle.read),
        component: () => import('@/features/vehicles/VehicleDetailPage'),
        children: [
          {
            id: 'vehicles.detail.overview',
            index: true,
            component: () => import('@/features/vehicles/tabs/VehicleOverviewTab'),
            breadcrumb: false,
          },
          {
            id: 'vehicles.detail.serviceHistory',
            path: ROUTE_PATHS.vehicleServiceHistory,
            title: 'Service history',
            access: access.permission(P.serviceRecord.read),
            component: () => import('@/features/vehicles/tabs/VehicleServiceHistoryTab'),
          },
          {
            id: 'vehicles.detail.documents',
            path: ROUTE_PATHS.vehicleDocuments,
            title: 'Documents',
            access: access.flag('documents'),
            component: () => import('@/features/vehicles/tabs/VehicleDocumentsTab'),
          },
          {
            id: 'vehicles.detail.reminders',
            path: ROUTE_PATHS.vehicleReminders,
            title: 'Reminders',
            access: access.permission(P.reminder.read),
            component: () => import('@/features/vehicles/tabs/VehicleRemindersTab'),
          },
        ],
      },
      {
        id: 'serviceRecords',
        path: ROUTE_PATHS.serviceRecords,
        title: 'Service records',
        access: access.permission(P.serviceRecord.read),
        component: () => import('@/features/service-records/ServiceRecordsPage'),
        nav: { label: 'Service records', icon: WrenchIcon, section: 'operations', order: 20 },
        keywords: ['jobs', 'repairs', 'work orders', 'history'],
      },
      {
        id: 'serviceRecords.detail',
        path: ROUTE_PATHS.serviceRecordDetail,
        title: 'Service record',
        access: access.permission(P.serviceRecord.read),
        component: () => import('@/features/service-records/ServiceRecordDetailPage'),
      },
      {
        id: 'serviceQueue',
        path: ROUTE_PATHS.serviceQueue,
        title: 'Service queue',
        // Flagged off: there is no queue endpoint yet. The route ships, stays
        // unreachable, and needs one boolean to go live.
        access: access.all(access.flag('serviceQueue'), access.permission(P.serviceRecord.readAll)),
        component: () => import('@/features/service-queue/ServiceQueuePage'),
        nav: { label: 'Service queue', icon: QueueIcon, section: 'operations', order: 30 },
        keywords: ['bay', 'board', 'in progress'],
      },
      {
        id: 'reminders',
        path: ROUTE_PATHS.reminders,
        title: 'Reminders',
        access: access.permission(P.reminder.read),
        component: () => import('@/features/reminders/RemindersPage'),
        nav: { label: 'Reminders', icon: ReminderIcon, section: 'operations', order: 40 },
        keywords: ['due', 'overdue', 'service due', 'follow up'],
      },
      {
        id: 'serviceCenters',
        path: ROUTE_PATHS.serviceCenters,
        title: 'Service centers',
        access: access.permission(P.serviceCenter.read),
        component: () => import('@/features/service-centers/ServiceCentersPage'),
        nav: { label: 'Service centers', icon: BuildingIcon, section: 'operations', order: 50 },
        keywords: ['garage', 'workshop', 'branch', 'location'],
      },
      {
        id: 'serviceCenters.detail',
        path: ROUTE_PATHS.serviceCenterDetail,
        title: 'Service center',
        access: access.permission(P.serviceCenter.read),
        component: () => import('@/features/service-centers/ServiceCenterDetailPage'),
        children: [
          {
            id: 'serviceCenters.detail.overview',
            index: true,
            component: () => import('@/features/service-centers/tabs/CenterOverviewTab'),
            breadcrumb: false,
          },
          {
            id: 'serviceCenters.detail.staff',
            path: ROUTE_PATHS.serviceCenterStaff,
            title: 'Staff',
            access: access.permission(P.staffProfile.read),
            component: () => import('@/features/service-centers/tabs/CenterStaffTab'),
          },
          {
            id: 'serviceCenters.detail.settings',
            path: ROUTE_PATHS.serviceCenterSettings,
            title: 'Center settings',
            access: access.permission(P.serviceCenter.manage),
            component: () => import('@/features/service-centers/tabs/CenterSettingsTab'),
          },
        ],
      },

      /* ---------------- People ---------------- */
      {
        id: 'staff',
        path: ROUTE_PATHS.staff,
        title: 'Staff',
        access: access.permission(P.staffProfile.read),
        component: () => import('@/features/staff/StaffPage'),
        nav: { label: 'Staff', icon: StaffIcon, section: 'people', order: 10 },
        keywords: ['technicians', 'team', 'employees'],
      },
      {
        id: 'staff.detail',
        path: ROUTE_PATHS.staffDetail,
        title: 'Staff member',
        access: access.permission(P.staffProfile.read),
        component: () => import('@/features/staff/StaffDetailPage'),
      },
      {
        id: 'owners',
        path: ROUTE_PATHS.owners,
        title: 'Customers',
        access: access.permission(P.vehicle.readAll),
        component: () => import('@/features/owners/OwnersPage'),
        nav: { label: 'Customers', icon: PersonIcon, section: 'people', order: 20 },
        keywords: ['owners', 'clients', 'contacts'],
      },
      {
        id: 'owners.detail',
        path: ROUTE_PATHS.ownerDetail,
        title: 'Customer',
        access: access.permission(P.vehicle.readAll),
        component: () => import('@/features/owners/OwnerDetailPage'),
        children: [
          {
            id: 'owners.detail.overview',
            index: true,
            component: () => import('@/features/owners/tabs/OwnerOverviewTab'),
            breadcrumb: false,
          },
          {
            id: 'owners.detail.vehicles',
            path: ROUTE_PATHS.ownerVehicles,
            title: 'Vehicles',
            access: access.permission(P.vehicle.read),
            component: () => import('@/features/owners/tabs/OwnerVehiclesTab'),
          },
          {
            id: 'owners.detail.serviceHistory',
            path: ROUTE_PATHS.ownerServiceHistory,
            title: 'Service history',
            access: access.permission(P.serviceRecord.read),
            component: () => import('@/features/owners/tabs/OwnerServiceHistoryTab'),
          },
          {
            id: 'owners.detail.expenses',
            path: ROUTE_PATHS.ownerExpenses,
            title: 'Spending',
            access: access.permission(P.vehicle.readAll),
            component: () => import('@/features/owners/tabs/OwnerExpensesTab'),
          },
        ],
      },
      {
        id: 'invitations',
        path: ROUTE_PATHS.invitations,
        title: 'Invitations',
        access: access.anyPermission(P.staffProfile.manage, P.staffProfile.create),
        component: () => import('@/features/invitations/InvitationsPage'),
        nav: { label: 'Invitations', icon: MailIcon, section: 'people', order: 30 },
        keywords: ['invite', 'onboard', 'pending'],
      },

      /* ---------------- Business ---------------- */
      {
        id: 'reports',
        path: ROUTE_PATHS.reports,
        title: 'Reports',
        access: access.all(access.flag('reports'), access.permission(P.report.read)),
        component: () => import('@/features/reports/ReportsPage'),
        nav: { label: 'Reports', icon: ChartIcon, section: 'business', order: 10 },
        keywords: ['analytics', 'revenue', 'insights', 'export'],
      },
      {
        id: 'invoices',
        path: ROUTE_PATHS.invoices,
        title: 'Invoices',
        access: access.all(access.flag('billing'), access.permission(P.billing.read)),
        component: () => import('@/features/billing/InvoicesPage'),
        nav: { label: 'Invoices', icon: InvoiceIcon, section: 'business', order: 20 },
        keywords: ['billing', 'bills', 'unpaid'],
      },
      {
        id: 'invoices.detail',
        path: ROUTE_PATHS.invoiceDetail,
        title: 'Invoice',
        access: access.all(access.flag('billing'), access.permission(P.billing.read)),
        component: () => import('@/features/billing/InvoiceDetailPage'),
      },
      {
        id: 'payments',
        path: ROUTE_PATHS.payments,
        title: 'Payments',
        access: access.all(access.flag('billing'), access.permission(P.billing.read)),
        component: () => import('@/features/billing/PaymentsPage'),
        nav: { label: 'Payments', icon: CardIcon, section: 'business', order: 30 },
        keywords: ['transactions', 'razorpay', 'refund'],
      },
      {
        id: 'subscription',
        path: ROUTE_PATHS.subscription,
        title: 'Subscription',
        // `POST /subscriptions/subscribe` is one of the few genuinely
        // role-gated endpoints (`requireRole('owner')`), so mirror that.
        access: access.all(access.flag('billing'), access.role('owner', 'admin')),
        component: () => import('@/features/billing/SubscriptionPage'),
        nav: { label: 'Subscription', icon: PlanIcon, section: 'business', order: 40 },
        keywords: ['plan', 'upgrade', 'seats'],
      },
      {
        id: 'subscription.plans',
        path: ROUTE_PATHS.subscriptionPlans,
        title: 'Plans',
        access: access.flag('billing'),
        component: () => import('@/features/billing/SubscriptionPlansPage'),
      },
      {
        id: 'documents',
        path: ROUTE_PATHS.documents,
        title: 'Documents',
        access: access.flag('documents'),
        component: () => import('@/features/documents/DocumentsPage'),
        nav: { label: 'Documents', icon: FolderIcon, section: 'business', order: 50 },
        keywords: ['files', 'attachments', 'uploads'],
      },
      {
        id: 'notifications',
        path: ROUTE_PATHS.notifications,
        title: 'Notifications',
        access: access.flag('notifications'),
        component: () => import('@/features/notifications/NotificationsPage'),
        keywords: ['alerts', 'inbox', 'unread'],
      },

      /* ---------------- Workspace administration ---------------- */
      {
        id: 'workspaceSettings',
        path: ROUTE_PATHS.workspaceSettings,
        title: 'Workspace',
        access: access.role('owner', 'admin'),
        component: () => import('@/features/settings/WorkspaceSettingsPage'),
        nav: { label: 'Workspace', icon: SettingsIcon, section: 'administration', order: 10 },
        keywords: ['tenant', 'organisation', 'company'],
      },
      {
        id: 'roles',
        path: ROUTE_PATHS.roles,
        title: 'Roles',
        access: access.permission(P.role.manage),
        component: () => import('@/features/settings/RolesPage'),
        nav: { label: 'Roles', icon: ShieldIcon, section: 'administration', order: 20 },
        keywords: ['rbac', 'access', 'groups'],
      },
      {
        id: 'roles.detail',
        path: ROUTE_PATHS.roleDetail,
        title: 'Role',
        access: access.permission(P.role.manage),
        component: () => import('@/features/settings/RoleDetailPage'),
      },
      {
        id: 'permissions',
        path: ROUTE_PATHS.permissions,
        title: 'Permissions',
        access: access.permission(P.permission.assign),
        component: () => import('@/features/settings/PermissionsPage'),
        nav: { label: 'Permissions', icon: KeyIcon, section: 'administration', order: 30 },
        keywords: ['grants', 'catalog', 'scopes'],
      },

      /* ---------------- Personal settings ----------------
       * Reached from the account menu rather than the side nav — they're
       * about the person, not the workspace. */
      {
        id: 'profile',
        path: ROUTE_PATHS.profile,
        title: 'Your profile',
        component: () => import('@/features/settings/ProfilePage'),
        keywords: ['account', 'name', 'email'],
      },
      {
        id: 'security',
        path: ROUTE_PATHS.security,
        title: 'Security',
        component: () => import('@/features/settings/SecurityPage'),
        keywords: ['password', 'mfa', '2fa', 'sessions'],
      },
      {
        id: 'appearance',
        path: ROUTE_PATHS.appearance,
        title: 'Appearance',
        component: () => import('@/features/settings/AppearancePage'),
        keywords: ['theme', 'dark mode', 'density', 'contrast', 'font', 'accent'],
      },

      /* ---------------- Platform administration ----------------
       * A subtree, so `access.role('admin')` composes onto every descendant
       * — a screen added here is admin-only whether or not it says so. */
      {
        id: 'admin',
        path: ROUTE_PATHS.admin,
        title: 'Platform',
        access: access.role('admin'),
        component: () => import('@/features/admin/AdminOverviewPage'),
        nav: { label: 'Platform', icon: SlidersIcon, section: 'administration', order: 40 },
        keywords: ['system', 'superadmin', 'cross-tenant'],
      },
      {
        id: 'admin.tenants',
        path: ROUTE_PATHS.adminTenants,
        title: 'Tenants',
        access: access.role('admin'),
        component: () => import('@/features/admin/AdminTenantsPage'),
        keywords: ['workspaces', 'organisations', 'approve'],
      },
      {
        id: 'admin.tenantDetail',
        path: ROUTE_PATHS.adminTenantDetail,
        title: 'Tenant',
        access: access.role('admin'),
        component: () => import('@/features/admin/AdminTenantDetailPage'),
      },
      {
        id: 'admin.users',
        path: ROUTE_PATHS.adminUsers,
        title: 'Users',
        access: access.role('admin'),
        component: () => import('@/features/admin/AdminUsersPage'),
        keywords: ['accounts', 'suspend', 'activate'],
      },
      {
        id: 'admin.system',
        path: ROUTE_PATHS.adminSystem,
        title: 'System health',
        access: access.role('admin'),
        component: () => import('@/features/admin/AdminSystemPage'),
        keywords: ['health', 'metrics', 'logs', 'maintenance'],
      },
      {
        id: 'auditLog',
        path: ROUTE_PATHS.auditLog,
        title: 'Audit log',
        access: access.all(access.flag('auditLog'), access.role('admin')),
        component: () => import('@/features/admin/AuditLogPage'),
        nav: { label: 'Audit log', icon: ListIcon, section: 'administration', order: 50 },
        keywords: ['activity', 'trail', 'who did what'],
      },

      /* ---------------- Terminal states inside the shell ---------------- */
      {
        id: 'notFound',
        path: '*',
        title: 'Not found',
        access: access.public(),
        component: () => import('@/features/system/NotFoundPage'),
        breadcrumb: false,
      },
    ],
  },
]
