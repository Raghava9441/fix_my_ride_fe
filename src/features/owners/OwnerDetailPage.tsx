import { Outlet, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  StatTile,
  Tabs,
  type TabDefinition,
} from '@/components/ui'
import { AlertIcon, MailIcon, PersonIcon } from '@/components/icons'
import { formatCurrency } from '@/components/charts'
import { useAccess } from '@/lib/access'
import { evaluate } from '@/lib/access/policy'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, getRouteEntry, to } from '@/lib/routing'
import { useOwner, useOwnerExpenses, useOwnerServiceHistory, useOwnerVehicles } from './api'
import { customerEmail, customerLocation, customerName, joinedLabel } from './customer'

/**
 * The filters the header's counts are read with.
 *
 * Deliberately identical to the ones the Vehicles and Service history tabs
 * pass, so the header and the tab share a cache entry instead of issuing two
 * requests for the same list. It also means opening a customer warms both
 * tabs, and switching to one renders immediately rather than flashing a
 * skeleton for data the header already fetched.
 */
const HISTORY_FILTERS = { limit: 25 } as const

export interface OwnerOutletContext {
  ownerId: string
}

/**
 * Layout for a single customer.
 *
 * The tabs are real child routes, so each is linkable, back-button friendly,
 * and independently guarded. The tab list is filtered through the same rules
 * that guard those routes — `getRouteEntry(id).access` is the *effective*
 * rule the router compiled — so a tab appears exactly when clicking it would
 * work, and there is no second list to keep in sync.
 *
 * Unlike the vehicle shell, this passes only the id through the outlet rather
 * than the record. The tabs here read different endpoints (vehicles, service
 * history, expenses) and none of them needs the profile itself, so handing
 * down a document they would ignore would just be a prop that drifts.
 */
export default function OwnerDetailPage() {
  const { ownerId = '' } = useParams()
  const { session, capabilities, isFlagEnabled } = useAccess()

  const { data: owner, isLoading, isError, error } = useOwner(ownerId)
  const apiError = asApiError(error)

  /*
   * The headline figures come from the sub-resources, not from
   * `owner.stats`.
   *
   * `stats` is a denormalised counter on the profile and the API is not
   * maintaining it: a customer with three completed jobs and $486 invoiced
   * still reports `{ totalServices: 0, totalSpent: 0 }`. Rendering that
   * would put a confident zero at the top of a screen whose own Spending
   * tab says otherwise — and a number that disagrees with the tab beneath it
   * is worse than a number that takes a moment to arrive.
   *
   * `totalSpent` carries no currency either, so formatting it would fall
   * back to the app default and label a dollar figure with a rupee sign.
   * The expenses endpoint sends the currency with the amount.
   *
   * `memberSince` is the one field here that is set at creation and never
   * recomputed, so it is still trustworthy.
   */
  const vehicles = useOwnerVehicles(ownerId)
  const history = useOwnerServiceHistory(ownerId, HISTORY_FILTERS)
  const expenses = useOwnerExpenses(ownerId)

  const candidates: { routeId: string; tab: TabDefinition }[] = [
    {
      routeId: 'owners.detail.overview',
      tab: { to: to.ownerDetail(ownerId), label: 'Overview', end: true },
    },
    {
      routeId: 'owners.detail.vehicles',
      tab: { to: to.ownerVehicles(ownerId), label: 'Vehicles' },
    },
    {
      routeId: 'owners.detail.serviceHistory',
      tab: { to: to.ownerServiceHistory(ownerId), label: 'Service history' },
    },
    {
      routeId: 'owners.detail.expenses',
      tab: { to: to.ownerExpenses(ownerId), label: 'Spending' },
    },
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
        <PageHeader title="Customer" backTo={ROUTE_PATHS.owners} backLabel="All customers" />
        <Card>
          <EmptyState
            icon={AlertIcon}
            title={apiError?.kind === 'not_found' ? 'Customer not found' : 'Couldn’t load this customer'}
            description={
              apiError?.kind === 'not_found'
                ? 'They may have been removed, or the link may be wrong.'
                : (apiError?.userMessage ?? 'Try again in a moment.')
            }
            action={
              <Button asChild variant="secondary" size="sm">
                <a href={ROUTE_PATHS.owners}>Back to customers</a>
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const name = owner ? customerName(owner) : 'Customer'
  const email = owner ? customerEmail(owner) : undefined
  const location = owner ? customerLocation(owner) : undefined
  const stats = owner?.stats
  const joined = joinedLabel(stats?.memberSince ?? owner?.createdAt)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backTo={ROUTE_PATHS.owners}
        backLabel="All customers"
        title={
          isLoading ? (
            <span className="skeleton inline-block h-6 w-48 align-middle" />
          ) : (
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar name={name} size="lg" />
              <span className="truncate">{name}</span>
            </span>
          )
        }
        meta={
          owner && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              {email ? (
                // A mailto is the one action this screen can offer without a
                // messaging endpoint behind it, and it is the thing someone
                // looking at a customer most often wants to do next.
                <a className="interactive inline-flex items-center gap-1.5 hover:text-accent" href={`mailto:${email}`}>
                  <MailIcon className="h-3.5 w-3.5" />
                  <span className="truncate">{email}</span>
                </a>
              ) : null}
              {owner.alternatePhone ? (
                <a className="interactive tabnum font-mono hover:text-accent" href={`tel:${owner.alternatePhone}`}>
                  {owner.alternatePhone}
                </a>
              ) : null}
              {location ? <span>{location}</span> : null}
            </span>
          )
        }
      />

      {/* Four figures, two-up on a phone and four-up from `sm`. These are the
          questions the screen exists to answer, so they sit above the tabs
          rather than inside the overview — switching tabs shouldn't take the
          headline numbers off screen. */}
      {/* Four figures, two-up on a phone and four-up from `sm`.

          Each falls back to an em dash when its query failed rather than to
          zero. `?? 0` would be the shorter spelling and the wrong one: a
          request that was rate-limited or timed out would render a confident
          "0 services" that is indistinguishable from a customer who has
          genuinely never been in. Unknown and none are different answers. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Vehicles"
          value={vehicles.isError ? '—' : (vehicles.data?.pagination.total ?? 0)}
          loading={vehicles.isLoading}
        />
        <StatTile
          label="Services"
          value={history.isError ? '—' : (history.data?.pagination.total ?? 0)}
          loading={history.isLoading}
        />
        <StatTile
          label="Total spent"
          value={
            expenses.isError
              ? '—'
              : formatCurrency(expenses.data?.total ?? 0, expenses.data?.currency)
          }
          loading={expenses.isLoading}
        />
        <StatTile label="Customer since" value={joined ?? '—'} loading={isLoading} />
      </div>

      <Tabs tabs={tabs} />

      {isLoading ? (
        <div className="skeleton h-64 rounded-card" />
      ) : owner ? (
        <Outlet context={{ ownerId } satisfies OwnerOutletContext} />
      ) : (
        <Card>
          <EmptyState icon={PersonIcon} title="No customer" />
        </Card>
      )}
    </div>
  )
}
