import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from '@/components/ui'
import {
  BarList,
  StatusBar,
  TrendAreaChart,
  DEFAULT_CURRENCY,
  formatCompactCurrency,
  formatCurrency,
  humanizeServiceType,
  STATUS_STYLES,
} from '@/components/charts'
import {
  CardIcon,
  ChartIcon,
  PersonIcon,
  ReminderIcon,
  VehicleIcon,
  WrenchIcon,
} from '@/components/icons'
import { Can, PERMISSIONS, access, useAccess } from '@/lib/access'
import { ACCOUNT_ROLE_LABELS } from '@/lib/access/roles'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, to, useNavigation } from '@/lib/routing'
import { useDashboardOverview } from '@/features/reports/api'
import type { OverviewScope } from '@/features/reports/types'
import { KpiTile } from './KpiTile'

/**
 * The dashboard.
 *
 * Layout follows the pattern the research converged on — a 4–6 tile KPI strip
 * above the fold, then a wide primary chart with narrower context beside it,
 * then lists. Everything above the fold answers "how is the business doing
 * right now"; detail lives below it.
 *
 * All of it comes from **one request**. Six separate calls would pay six times
 * the latency and land at six different moments, so the tiles would pop in one
 * by one and the page would reflow under the reader.
 */

const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' },
  { days: 365, label: '1y' },
] as const

const SCOPE_COPY: Record<OverviewScope, { title: string; description: string }> = {
  center: {
    title: 'Service center',
    description: 'Revenue, throughput, and workload across your center.',
  },
  owner: { title: 'Your vehicles', description: 'Spend, service history, and what is due next.' },
  platform: { title: 'Platform', description: 'Activity across every workspace on the platform.' },
  none: { title: 'Workspace', description: 'Your account is not linked to a center or a vehicle yet.' },
}

export default function DashboardPage() {
  const { session, capabilities } = useAccess()
  const sections = useNavigation()
  const [days, setDays] = useState<number>(30)

  const { data, isLoading, isError, error, isPlaceholderData } = useDashboardOverview(days)

  const apiError = asApiError(error)
  const kpis = data?.kpis
  const scope = data?.scope ?? 'none'
  // Comes from the payload rather than being assumed: hardcoding one here
  // rendered aggregate totals in a different currency from the per-record
  // costs listed directly beneath them.
  const currency = data?.currency ?? DEFAULT_CURRENCY

  const greeting = session?.name || session?.email.split('@')[0] || 'there'

  // The trend feeds both the main chart and the tiny sparklines in the tiles,
  // so it is derived once here rather than in each consumer.
  const revenueSeries = data?.revenueTrend.map((p) => p.revenue) ?? []
  const jobsSeries = data?.revenueTrend.map((p) => p.jobs) ?? []

  const trendPoints =
    data?.revenueTrend.map((p) => ({ date: p.date, value: p.revenue, secondary: p.jobs })) ?? []

  const overdue = data?.reminders.overdueCount ?? 0
  const upcoming = data?.reminders.upcoming ?? []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome back, ${greeting}`}
        description={SCOPE_COPY[scope].description}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            {session && <Badge tone="accent">{ACCOUNT_ROLE_LABELS[session.primaryRole]}</Badge>}
            <Badge tone="neutral">{SCOPE_COPY[scope].title}</Badge>
            {overdue > 0 && <Badge tone="critical">{overdue} overdue</Badge>}
          </div>
        }
        actions={
          <Can rule={access.permission(PERMISSIONS.vehicle.create)}>
            <Button asChild size="sm">
              <Link to={ROUTE_PATHS.vehicleNew}>Add vehicle</Link>
            </Button>
          </Can>
        }
      />

      {/* Range filter sits in one row above the charts, per the interaction
          spec — not buried inside an individual card's header. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex gap-1 rounded-pill border border-border bg-surface-raised p-1"
          role="group"
          aria-label="Date range"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              aria-pressed={days === range.days}
              className={
                days === range.days
                  ? 'interactive rounded-pill bg-accent px-3 py-1 text-xs font-bold text-accent-contrast'
                  : 'interactive rounded-pill px-3 py-1 text-xs font-semibold text-text-muted hover:bg-surface-sunken'
              }
            >
              {range.label}
            </button>
          ))}
        </div>

        {data && (
          <span className="text-[11px] text-text-faint">
            Updated {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {isError && (
        <Card>
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm text-critical">
              {apiError?.userMessage ?? 'Couldn’t load your dashboard.'}
            </p>
            {apiError?.requestId && (
              <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </CardBody>
        </Card>
      )}

      {/*
        Six tiles: two columns on a phone, three on a tablet, six on a desktop.
        Two-up rather than one-up on mobile keeps the whole strip above the
        fold on a phone, which is the point of a KPI row.
      */}
      <div
        className={
          isPlaceholderData
            ? 'grid grid-cols-2 gap-3 opacity-60 transition-opacity md:grid-cols-3 xl:grid-cols-6'
            : 'grid grid-cols-2 gap-3 transition-opacity md:grid-cols-3 xl:grid-cols-6'
        }
      >
        <KpiTile
          label="Revenue"
          kpi={kpis?.revenue}
          // Compact, not exact: a KPI tile is a headline figure read at a
          // glance, and "₹12,45,780.00" in a 6-across grid wraps and buries
          // the number it exists to show.
          format={(v) => formatCompactCurrency(v, currency)}
          icon={CardIcon}
          trend={revenueSeries}
          loading={isLoading}
        />
        <KpiTile label="Jobs" kpi={kpis?.jobs} icon={WrenchIcon} trend={jobsSeries} loading={isLoading} />
        <KpiTile
          label="Avg. repair order"
          kpi={kpis?.averageRepairOrder}
          format={(v) => formatCompactCurrency(v, currency)}
          icon={ChartIcon}
          loading={isLoading}
        />
        <KpiTile
          label="Completion"
          kpi={kpis?.completionRate}
          format={(v) => `${v}%`}
          icon={ChartIcon}
          loading={isLoading}
        />
        <KpiTile label="Vehicles" kpi={kpis?.activeVehicles} icon={VehicleIcon} loading={isLoading} />
        <KpiTile
          label={scope === 'platform' ? 'Accounts' : 'Customers'}
          kpi={kpis?.customers}
          icon={PersonIcon}
          loading={isLoading}
        />
      </div>

      {/*
        Primary chart takes two thirds; the pipeline and type breakdown share
        the remaining third. On a phone they stack in reading order — the
        headline trend first.
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue over time"
            description={`Completed jobs, last ${days} days. Hover for a day’s detail.`}
          />
          <CardBody className="pt-2">
            {isLoading ? (
              <div className="skeleton h-[240px] rounded-input" />
            ) : trendPoints.length > 0 ? (
              <TrendAreaChart
                points={trendPoints}
                format={(v) => formatCompactCurrency(v, currency)}
                valueLabel="Revenue"
                secondaryLabel="Jobs"
              />
            ) : (
              <EmptyState
                icon={ChartIcon}
                size="sm"
                title="No activity yet"
                description="Completed jobs will chart here as they’re recorded."
              />
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Job pipeline" description={`Status mix over the last ${days} days.`} />
            <CardBody className="pt-3">
              {isLoading ? (
                <div className="skeleton h-24 rounded-input" />
              ) : (
                <StatusBar data={data?.jobsByStatus ?? []} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Top service types" description="By job count." />
            <CardBody className="pt-3">
              {isLoading ? (
                <div className="skeleton h-32 rounded-input" />
              ) : (
                <BarList
                  items={(data?.jobsByType ?? []).map((t) => ({
                    label: humanizeServiceType(t.serviceType),
                    value: t.count,
                    display: `${t.count}`,
                    meta: t.revenue > 0 ? formatCompactCurrency(t.revenue, currency) : undefined,
                  }))}
                  emptyMessage="No jobs recorded in this period."
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Below the fold: the detail behind the numbers above. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent activity"
            description="The latest service records."
            actions={
              <Can rule={access.permission(PERMISSIONS.serviceRecord.read)}>
                <Button asChild variant="ghost" size="sm">
                  <Link to={ROUTE_PATHS.serviceRecords}>View all</Link>
                </Button>
              </Can>
            }
          />
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-12 rounded-input" />
                ))}
              </div>
            ) : (data?.recentServiceRecords.length ?? 0) === 0 ? (
              <EmptyState
                icon={WrenchIcon}
                size="sm"
                title="Nothing logged yet"
                description="Service records appear here as work is booked in."
              />
            ) : (
              <ul>
                {data?.recentServiceRecords.map((record) => {
                  const vehicle = typeof record.vehicleId === 'object' ? record.vehicleId : null
                  const style = STATUS_STYLES[record.status]

                  return (
                    <li key={record._id} className="border-b border-border last:border-b-0">
                      <Link
                        to={to.serviceRecordDetail(record._id)}
                        className="interactive flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-sunken"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="h-2 w-2 flex-none rounded-full"
                            style={{ background: style.color }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {vehicle
                                ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() ||
                                  vehicle.registrationNumber
                                : humanizeServiceType(record.serviceType)}
                            </div>
                            <div className="truncate text-xs text-text-muted">
                              {humanizeServiceType(record.serviceType)}
                              {vehicle?.registrationNumber && ` · ${vehicle.registrationNumber}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-none flex-col items-end gap-0.5">
                          <span className="tabnum font-mono text-sm font-semibold">
                            {formatCurrency(record.cost?.total ?? 0, record.cost?.currency ?? currency)}
                          </span>
                          {/* Status as text, never colour alone. */}
                          <span className="text-[10px] font-semibold" style={{ color: style.color }}>
                            {style.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Coming up"
            description="Reminders due in the next 30 days."
            actions={
              overdue > 0 ? (
                <Badge tone="critical">{overdue} overdue</Badge>
              ) : (
                <Can rule={access.permission(PERMISSIONS.reminder.read)}>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={ROUTE_PATHS.reminders}>View all</Link>
                  </Button>
                </Can>
              )
            }
          />
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-12 rounded-input" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                icon={ReminderIcon}
                size="sm"
                title="Nothing due"
                description="Upcoming services and renewals will show here."
              />
            ) : (
              <ul>
                {upcoming.map((reminder) => (
                  <li key={reminder._id} className="border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{reminder.title}</div>
                        <div className="truncate text-xs text-text-muted">
                          {humanizeServiceType(reminder.type)}
                        </div>
                      </div>
                      <span className="tabnum flex-none text-xs text-text-muted">
                        {new Date(reminder.dueDate).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/*
        Built from the same navigation the rail renders, so it can only ever
        offer sections this account can actually open — and a new section
        appears here automatically when its route is added.
      */}
      <Card>
        <CardHeader
          title="Your workspace"
          description="Sections available to you, based on your role and permissions."
        />
        <CardBody className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sections.flatMap((section) =>
            section.items.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className="interactive flex items-center gap-2.5 rounded-input border border-border px-3 py-2.5 hover:border-border-strong hover:bg-surface-sunken"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-input bg-surface-sunken text-text-muted">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{item.label}</span>
                  {section.label && (
                    <span className="block text-[10px] uppercase tracking-wide text-text-faint">
                      {section.label}
                    </span>
                  )}
                </span>
              </Link>
            )),
          )}
        </CardBody>
      </Card>

      <p className="text-[11px] text-text-faint">
        {capabilities.permissions.size} permissions in this session · scope {scope}
      </p>
    </div>
  )
}
