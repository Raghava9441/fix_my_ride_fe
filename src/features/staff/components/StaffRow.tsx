import { Link } from 'react-router-dom'
import { Avatar, Badge } from '@/components/ui'
import { to } from '@/lib/routing'
import type { StaffProfile } from '../types'
import {
  EMPLOYMENT_STATUS,
  EMPLOYMENT_TYPE_LABEL,
  joinedLabel,
  staffCenterName,
  staffDisplayName,
  staffEmail,
  staffRoleName,
} from '../staffMember'

/**
 * One staff member, as a row that reflows into a card.
 *
 * Same single-grid approach as `CustomerRow`: one DOM tree re-templated at
 * `lg` rather than a desktop table and a mobile card list rendered together.
 *
 * The figures differ from the customer list for a data reason.
 * `stats.totalServicesPerformed` is a denormalised counter the API never
 * updates — it reads 0 for a technician whose `/services` endpoint returns
 * completed jobs — so the headline number here is the rating, which is
 * genuinely maintained. Showing a confident "0 jobs" beside a 4.5★ average
 * would undermine both.
 */
export function StaffRow({
  staff,
  onPrefetch,
}: {
  staff: StaffProfile
  onPrefetch?: () => void
}) {
  const name = staffDisplayName(staff)
  const email = staffEmail(staff)
  const role = staffRoleName(staff)
  const center = staffCenterName(staff)
  const status = EMPLOYMENT_STATUS[staff.employmentStatus] ?? EMPLOYMENT_STATUS.active
  const joined = joinedLabel(staff.joinedAt)

  return (
    <Link
      to={to.staffDetail(staff._id)}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="interactive group grid grid-cols-2 items-center gap-x-3 gap-y-3 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-surface-sunken lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1.7fr)_7rem_minmax(0,1fr)_5.5rem] lg:gap-x-4 lg:gap-y-0 lg:py-3"
    >
      {/* Identity */}
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <Avatar name={email ?? name} size="md" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text group-hover:text-accent">
            {name}
          </div>
          {/* Always shown: the display name above is derived from this, and
              hiding the source would make the derivation look like data. */}
          {email ? <div className="truncate text-xs text-text-muted">{email}</div> : null}
        </div>
      </div>

      {/* Role and where they work */}
      <div className="col-span-2 min-w-0 lg:col-span-1">
        <div className="truncate text-xs font-semibold text-text-muted">{role ?? '—'}</div>
        {center ? <div className="truncate text-xs text-text-faint">{center}</div> : null}
      </div>

      {/* Employment */}
      <div className="flex flex-col items-start gap-1">
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className="text-[10px] text-text-faint">
          {EMPLOYMENT_TYPE_LABEL[staff.employmentType] ?? staff.employmentType}
        </span>
      </div>

      {/* Rating — the one performance figure the API actually maintains. */}
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-text-faint lg:hidden">
          Rating
        </div>
        {staff.averageRating ? (
          <div className="tabnum truncate font-mono text-sm text-text-muted">
            {staff.averageRating.toFixed(1)}★
            {staff.totalReviews ? (
              <span className="text-text-faint"> · {staff.totalReviews}</span>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-text-faint">—</div>
        )}
      </div>

      <div className="hidden text-right text-xs text-text-faint lg:block">{joined ?? '—'}</div>
    </Link>
  )
}
