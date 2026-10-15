import { Link } from 'react-router-dom'
import { Avatar, Badge } from '@/components/ui'
import { to } from '@/lib/routing'
import type { ServiceCenter } from '../types'
import { centerStatus, formatAddress } from '../serviceCenter'

/**
 * One service center, as a row that reflows into a card.
 *
 * Same single-grid approach as `StaffRow`. The grid template is duplicated in
 * `ServiceCenterListHeader` — Tailwind only emits classes it can see
 * literally, so the string can't be hoisted into a shared constant.
 */
export function ServiceCenterRow({
  center,
  onPrefetch,
}: {
  center: ServiceCenter
  onPrefetch?: () => void
}) {
  const status = centerStatus(center)
  const location = formatAddress(center.address, true)
  const rating = center.stats?.averageRating
  const services = center.servicesOffered?.length

  return (
    <Link
      to={to.serviceCenterDetail(center._id)}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="interactive group grid grid-cols-2 items-center gap-x-3 gap-y-3 border-b border-border px-4 py-3.5 last:border-b-0 hover:bg-surface-sunken lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_6rem_5rem] lg:gap-x-4 lg:gap-y-0 lg:py-3"
    >
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <Avatar name={center.name} size="md" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text group-hover:text-accent">
            {center.name}
          </div>
          <div className="truncate text-xs text-text-muted">{location ?? 'No address'}</div>
        </div>
      </div>

      <div className="col-span-2 min-w-0 lg:col-span-1">
        <div className="truncate text-xs text-text-muted">{center.email}</div>
        <div className="truncate text-xs text-text-faint">{center.phone}</div>
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-text-faint lg:hidden">
          Services
        </div>
        <div className="truncate text-sm text-text-muted">
          {services ? `${services} offered` : <span className="text-text-faint">—</span>}
        </div>
      </div>

      <div>
        {status ? (
          <Badge tone={status.tone}>{status.label}</Badge>
        ) : (
          <span className="text-text-faint">—</span>
        )}
      </div>

      <div className="min-w-0 text-right">
        {rating ? (
          <span className="tabnum font-mono text-sm text-text-muted">{rating.toFixed(1)}★</span>
        ) : (
          <span className="text-sm text-text-faint">—</span>
        )}
      </div>
    </Link>
  )
}
