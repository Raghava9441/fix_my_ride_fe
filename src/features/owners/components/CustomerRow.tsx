import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { formatCurrency } from '@/components/charts'
import { to } from '@/lib/routing'
import type { OwnerProfile } from '../types'
import { customerEmail, customerLocation, customerName, joinedLabel } from '../customer'

/**
 * One customer, as a row that reflows into a card.
 *
 * ---- Why one element and not a table plus a card list ----
 *
 * The obvious way to get a dense desktop table and a readable phone layout
 * is to render both and toggle them with `hidden` / `lg:block`. That ships
 * every row twice: two DOM subtrees, two sets of links for a screen reader
 * to walk, and two renders per row on every keystroke of the search box.
 *
 * This is one grid instead, re-templated at `lg`. On a phone it stacks into
 * an identity block, a contact line, and a three-up strip of figures; on a
 * wide screen those same cells become six aligned columns. Nothing is
 * duplicated, and the only thing hidden is the one column with nowhere to
 * go at that width.
 */
export function CustomerRow({
  owner,
  onPrefetch,
}: {
  owner: OwnerProfile
  onPrefetch?: () => void
}) {
  const name = customerName(owner)
  const email = customerEmail(owner)
  const location = customerLocation(owner)
  const stats = owner.stats
  const joined = joinedLabel(stats?.memberSince ?? owner.createdAt)

  return (
    <Link
      to={to.ownerDetail(owner._id)}
      // Warms the detail cache before the click lands, so the next screen
      // usually renders with data rather than a skeleton.
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="interactive group grid grid-cols-3 items-center gap-x-3 gap-y-3 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-surface-sunken lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_4.5rem_4.5rem_minmax(0,1fr)_6rem] lg:gap-x-4 lg:gap-y-0 lg:py-3"
    >
      {/* Identity. Avatar and name share one cell so they stay together when
          the grid re-templates. */}
      <div className="col-span-3 flex min-w-0 items-center gap-3 lg:col-span-1">
        {/* One avatar at one size, deliberately. Rendering a large one for
            phones and a small one for desktop with `lg:hidden` / `hidden
            lg:block` does not work here: `Avatar`'s base class sets
            `inline-flex`, Tailwind emits `.inline-flex` after `.hidden`, and
            the later rule wins whatever order the names appear in — so both
            avatars show side by side at every width. */}
        <Avatar name={name} size="md" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text group-hover:text-accent">{name}</div>
          {email ? <div className="truncate text-xs text-text-muted">{email}</div> : null}
        </div>
      </div>

      {/* Contact. On a phone this folds under the name instead of competing
          with it for the same line. */}
      <div className="col-span-3 min-w-0 lg:col-span-1">
        {owner.alternatePhone ? (
          <div className="tabnum truncate font-mono text-xs text-text-muted">{owner.alternatePhone}</div>
        ) : null}
        {location ? <div className="truncate text-xs text-text-faint">{location}</div> : null}
      </div>

      {/* The three figures: a strip on a phone, three aligned columns wide. */}
      <Figure label="Vehicles" value={stats?.totalVehicles ?? 0} />
      <Figure label="Services" value={stats?.totalServices ?? 0} />
      <Figure label="Spent" value={formatCurrency(stats?.totalSpent ?? 0)} />

      {/* Joined last: the least-scanned fact, and so the first to go when the
          viewport can't hold six columns. */}
      <div className="hidden text-right text-xs text-text-faint lg:block">{joined ?? '—'}</div>
    </Link>
  )
}

/**
 * A labelled figure: a stat chip on a phone, a bare column on a wide screen.
 *
 * The label renders at narrow widths rather than being replaced by a table
 * header, because at phone width there is no header row to carry it — a
 * bare `3` beside a bare `12` tells the reader nothing.
 */
function Figure({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-text-faint lg:hidden">
        {label}
      </div>
      <div className="tabnum truncate font-mono text-sm text-text-muted">{value}</div>
    </div>
  )
}
