import { Link, useOutletContext } from 'react-router-dom'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  type DescriptionItem,
} from '@/components/ui'
import { BellIcon, VehicleIcon } from '@/components/icons'
import { to } from '@/lib/routing'
import { asApiError } from '@/lib/queryClient'
import type { OwnerOutletContext } from '../OwnerDetailPage'
import { useOwner, useOwnerPreferences, useOwnerVehicles } from '../api'
import { customerEmail } from '../customer'
import type { OwnerNotificationPreferences } from '../types'

/**
 * The customer at a glance: who they are, where they are, and how they have
 * asked to be contacted.
 *
 * Laid out as two columns from `lg` and one below it. The contact details
 * and the notification preferences are independent — you read one or the
 * other, never across them — so side by side uses the width without making
 * anything harder to scan, and stacking on a phone costs nothing.
 */
export default function OwnerOverviewTab() {
  const { ownerId } = useOutletContext<OwnerOutletContext>()

  const { data: owner } = useOwner(ownerId)
  const preferences = useOwnerPreferences(ownerId)
  // Just enough to show the primary vehicle; the full list is its own tab.
  const vehicles = useOwnerVehicles(ownerId, { limit: 3 })

  if (!owner) return null

  const email = customerEmail(owner)
  const address = owner.address

  const contact: DescriptionItem[] = [
    {
      label: 'Email',
      value: email ? (
        <a className="interactive hover:text-accent" href={`mailto:${email}`}>
          {email}
        </a>
      ) : (
        '—'
      ),
    },
    {
      label: 'Phone',
      value: owner.alternatePhone ? (
        <a className="interactive tabnum font-mono hover:text-accent" href={`tel:${owner.alternatePhone}`}>
          {owner.alternatePhone}
        </a>
      ) : (
        '—'
      ),
    },
    {
      label: 'Address',
      wide: true,
      value:
        [address?.street, address?.city, address?.state, address?.postalCode, address?.country]
          .filter(Boolean)
          .join(', ') || '—',
    },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Contact" />
        <CardBody>
          <DescriptionList items={contact} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Notifications"
          description="How this customer has asked to be reached."
        />
        <CardBody>
          {preferences.isLoading ? (
            <div className="skeleton h-24 w-full rounded-input" />
          ) : preferences.isError ? (
            <p className="text-sm text-text-muted">
              {asApiError(preferences.error)?.userMessage ?? 'Couldn’t load preferences.'}
            </p>
          ) : (
            <NotificationSummary preferences={preferences.data ?? owner.notificationPreferences} />
          )}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          title="Vehicles"
          actions={
            <Link
              to={to.ownerVehicles(ownerId)}
              className="interactive text-xs font-semibold text-accent"
            >
              View all
            </Link>
          }
        />
        {vehicles.isLoading ? (
          <CardBody>
            <div className="skeleton h-20 w-full rounded-input" />
          </CardBody>
        ) : vehicles.data?.items.length ? (
          vehicles.data.items.map((vehicle) => (
            <Link
              key={vehicle._id}
              to={to.vehicleDetail(vehicle._id)}
              className="interactive flex items-center justify-between gap-3 border-t border-border px-4 py-3 hover:bg-surface-sunken"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {vehicle.make} {vehicle.model}
                </div>
                <div className="font-mono text-xs text-text-muted">{vehicle.registrationNumber}</div>
              </div>
              <Badge tone="neutral">{vehicle.fuelType}</Badge>
            </Link>
          ))
        ) : (
          <EmptyState
            icon={VehicleIcon}
            title="No vehicles"
            description="Nothing is registered to this customer yet."
          />
        )}
      </Card>
    </div>
  )
}

/**
 * Renders the channels that are actually switched on.
 *
 * Listing every channel with an on/off marker would be a wall of mostly
 * "off"; what a service advisor needs to know is which ones will reach the
 * person. The empty case is stated explicitly rather than rendering nothing,
 * because "no preferences recorded" and "we can't contact them" are
 * different facts and an empty panel reads as the first.
 */
function NotificationSummary({ preferences }: { preferences?: OwnerNotificationPreferences }) {
  if (!preferences) {
    return (
      <p className="text-sm text-text-muted">
        No preferences recorded — the workspace defaults apply.
      </p>
    )
  }

  const groups: Array<{ label: string; channels?: Record<string, boolean | undefined> }> = [
    { label: 'Service reminders', channels: preferences.serviceReminders },
    { label: 'Invoices', channels: preferences.invoiceNotifications },
    { label: 'Center updates', channels: preferences.centerCommunications },
  ]

  const quietHours = preferences.quietHours

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ label, channels }) => {
        const on = Object.entries(channels ?? {})
          .filter(([, enabled]) => enabled)
          .map(([channel]) => channel)

        return (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-sm text-text-muted">{label}</span>
            {on.length ? (
              <span className="flex flex-wrap gap-1">
                {on.map((channel) => (
                  <Badge key={channel} tone="success">
                    {channel}
                  </Badge>
                ))}
              </span>
            ) : (
              <Badge tone="neutral">Off</Badge>
            )}
          </div>
        )
      })}

      {quietHours?.enabled ? (
        <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-text-muted">
          <BellIcon className="h-3.5 w-3.5 flex-none" />
          <span>
            Quiet hours {quietHours.start ?? '—'} to {quietHours.end ?? '—'}
          </span>
        </div>
      ) : null}
    </div>
  )
}
