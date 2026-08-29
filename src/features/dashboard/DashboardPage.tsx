import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardBody, CardHeader, StatTile } from '@/components/ui'
import { Can, PERMISSIONS, access, useAccess } from '@/lib/access'
import { ACCOUNT_ROLE_LABELS } from '@/lib/access/roles'
import { ROUTE_PATHS, useNavigation } from '@/lib/routing'
import { useVehicles } from '@/features/vehicles/api'

export default function DashboardPage() {
  const { session, capabilities } = useAccess()
  const sections = useNavigation()
  const { data: vehicles, isLoading, isError } = useVehicles()

  const greeting = session?.name || session?.email.split('@')[0] || 'there'

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome back, ${greeting}`}
        description="What's happening across your workspace today."
        meta={session && <Badge tone="accent">{ACCOUNT_ROLE_LABELS[session.primaryRole]}</Badge>}
        actions={
          <Can rule={access.permission(PERMISSIONS.vehicle.create)}>
            <Button asChild size="sm">
              <Link to={ROUTE_PATHS.vehicleNew}>Add vehicle</Link>
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Vehicles"
          value={isError ? '—' : (vehicles?.length ?? 0)}
          sub={isError ? 'could not load' : 'on record'}
          loading={isLoading}
        />
        <StatTile label="Overdue services" value={0} sub="needs attention" tone="critical" />
        <StatTile label="Open jobs" value={0} sub="in the bays" />
        <StatTile label="Permissions" value={capabilities.permissions.size} sub="in this session" />
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
    </div>
  )
}
