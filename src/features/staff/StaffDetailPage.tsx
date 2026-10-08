import { useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Menu,
  MenuItem,
  MenuSeparator,
  StatTile,
  Tabs,
  useToast,
  type TabDefinition,
} from '@/components/ui'
import { AlertIcon, ChevronDownIcon, MailIcon, StaffIcon } from '@/components/icons'
import { formatCurrency } from '@/components/charts'
import { PERMISSIONS as P, access, useAccess, Can } from '@/lib/access'
import { evaluate } from '@/lib/access/policy'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, getRouteEntry, to } from '@/lib/routing'
import { useDeleteStaff, useStaffMember, useStaffPerformance, useStaffServices } from './api'
import { EditStaffDialog } from './components/EditStaffDialog'
import {
  EMPLOYMENT_STATUS,
  EMPLOYMENT_TYPE_LABEL,
  joinedLabel,
  staffCenterName,
  staffDisplayName,
  staffEmail,
  staffRoleName,
} from './staffMember'

export interface StaffOutletContext {
  staffId: string
}

/** Matches the Jobs tab's filters so the header and tab share one cache entry. */
const SERVICES_FILTERS = { limit: 25 } as const

/**
 * Layout for a single staff member.
 *
 * Tabs are real child routes, filtered through the same access rules that
 * guard them — so the Permissions tab is simply absent for someone who
 * couldn't change permissions anyway.
 *
 * The job count comes from the services endpoint rather than from
 * `stats.totalServicesPerformed`, which the API never updates: it reads zero
 * for a technician whose jobs tab lists completed work. The rating does come
 * from the profile, because that one is maintained.
 */
export default function StaffDetailPage() {
  const { staffId = '' } = useParams()
  const { session, capabilities, isFlagEnabled } = useAccess()
  const navigate = useNavigate()
  const toast = useToast()

  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null)

  const { data: staff, isLoading, isError, error } = useStaffMember(staffId)
  const services = useStaffServices(staffId, SERVICES_FILTERS)
  const performance = useStaffPerformance(staffId)
  const deleteStaff = useDeleteStaff()
  const apiError = asApiError(error)

  const candidates: { routeId: string; tab: TabDefinition }[] = [
    {
      routeId: 'staff.detail.overview',
      tab: { to: to.staffDetail(staffId), label: 'Overview', end: true },
    },
    { routeId: 'staff.detail.schedule', tab: { to: to.staffSchedule(staffId), label: 'Schedule' } },
    {
      routeId: 'staff.detail.permissions',
      tab: { to: to.staffPermissions(staffId), label: 'Permissions' },
    },
    { routeId: 'staff.detail.services', tab: { to: to.staffServices(staffId), label: 'Jobs' } },
  ]

  const tabs = candidates
    .filter(({ routeId }) => {
      const entry = getRouteEntry(routeId)
      if (!entry) return false
      return evaluate(entry.access, { session, capabilities, isFlagEnabled }).allowed
    })
    .map(({ tab }) => tab)

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Staff member" backTo={ROUTE_PATHS.staff} backLabel="All staff" />
        <Card>
          <EmptyState
            icon={AlertIcon}
            title={apiError?.kind === 'not_found' ? 'Staff member not found' : 'Couldn’t load this profile'}
            description={
              apiError?.kind === 'not_found'
                ? 'They may have been removed, or the link may be wrong.'
                : (apiError?.userMessage ?? 'Try again in a moment.')
            }
            action={
              <Button asChild variant="secondary" size="sm">
                <a href={ROUTE_PATHS.staff}>Back to staff</a>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const name = staff ? staffDisplayName(staff) : 'Staff member'
  const email = staff ? staffEmail(staff) : undefined
  const role = staff ? staffRoleName(staff) : undefined
  const center = staff ? staffCenterName(staff) : undefined
  const status = staff ? EMPLOYMENT_STATUS[staff.employmentStatus] : undefined
  const rating = staff?.averageRating ?? performance.data?.averageRating

  /*
   * The performance endpoint sends a revenue figure with no currency, so
   * formatting it alone would label a dollar total with the app's default
   * rupee sign. The jobs it was summed from do carry one, and they are
   * already fetched for the Jobs count — so the currency is read from there
   * rather than guessed, the same way the service-records list does it.
   */
  const revenueCurrency = services.data?.items[0]?.cost?.currency

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo={ROUTE_PATHS.staff}
        backLabel="All staff"
        title={
          isLoading ? (
            <span className="skeleton inline-block h-6 w-48 align-middle" />
          ) : (
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar name={email ?? name} size="lg" />
              <span className="truncate">{name}</span>
            </span>
          )
        }
        meta={
          staff && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
              {role ? <span className="font-semibold text-text">{role}</span> : null}
              {center ? <span>{center}</span> : null}
              {email ? (
                <a
                  className="interactive inline-flex items-center gap-1.5 hover:text-accent"
                  href={`mailto:${email}`}
                >
                  <MailIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{email}</span>
                </a>
              ) : null}
            </span>
          )
        }
        actions={
          staff && (
            <Can rule={access.anyPermission(P.staffProfile.update, P.staffProfile.delete)}>
              <Menu
                trigger={
                  <Button size="sm" variant="secondary">
                    Manage
                    <ChevronDownIcon className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <Can rule={access.permission(P.staffProfile.update)}>
                  <MenuItem onSelect={() => setDialog('edit')}>Edit details</MenuItem>
                </Can>
                <Can rule={access.permission(P.staffProfile.delete)}>
                  <MenuSeparator />
                  <MenuItem danger onSelect={() => setDialog('delete')}>
                    Remove from staff
                  </MenuItem>
                </Can>
              </Menu>
            </Can>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Jobs"
          value={services.isError ? '—' : (services.data?.pagination.total ?? 0)}
          loading={services.isLoading}
        />
        <StatTile
          label="Rating"
          value={rating ? `${rating.toFixed(1)}★` : '—'}
          sub={staff?.totalReviews ? `${staff.totalReviews} reviews` : undefined}
          loading={isLoading}
        />
        <StatTile
          label="Revenue"
          value={
            performance.isError
              ? '—'
              : formatCurrency(performance.data?.revenueGenerated ?? 0, revenueCurrency)
          }
          loading={performance.isLoading}
        />
        <StatTile
          label="Joined"
          value={joinedLabel(staff?.joinedAt) ?? '—'}
          sub={staff ? EMPLOYMENT_TYPE_LABEL[staff.employmentType] : undefined}
          loading={isLoading}
        />
      </div>

      <Tabs tabs={tabs} />

      {isLoading ? (
        <div className="skeleton h-64 rounded-card" />
      ) : staff ? (
        <Outlet context={{ staffId } satisfies StaffOutletContext} />
      ) : (
        <Card>
          <EmptyState icon={StaffIcon} title="No staff member" />
        </Card>
      )}

      {staff && (
        <>
          <EditStaffDialog
            staff={staff}
            open={dialog === 'edit'}
            onClose={() => setDialog(null)}
          />
          <ConfirmDialog
            open={dialog === 'delete'}
            onClose={() => setDialog(null)}
            loading={deleteStaff.isPending}
            danger
            title="Remove from staff?"
            description={`${name} loses access to ${center ?? 'their service center'}. Their completed jobs stay on record and keep pointing at them.`}
            confirmLabel="Remove"
            onConfirm={() =>
              deleteStaff.mutate(staff._id, {
                onSuccess: () => {
                  toast.success('Removed from staff')
                  navigate(ROUTE_PATHS.staff, { replace: true })
                },
              })
            }
          />
        </>
      )}
    </div>
  )
}
