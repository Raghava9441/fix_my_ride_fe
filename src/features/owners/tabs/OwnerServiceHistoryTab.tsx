import { Link, useOutletContext } from 'react-router-dom'
import { Card, CardBody, EmptyState, SkeletonRows } from '@/components/ui'
import { WrenchIcon } from '@/components/icons'
import {
  DEFAULT_CURRENCY,
  STATUS_STYLES,
  formatCurrency,
  humanizeServiceType,
} from '@/components/charts'
import { isPopulated } from '@/lib/api'
import { asApiError } from '@/lib/queryClient'
import { to } from '@/lib/routing'
import type { OwnerOutletContext } from '../OwnerDetailPage'
import { useOwnerServiceHistory } from '../api'
import type { ServiceStatus } from '@/features/service-records/types'

/**
 * Every job this customer has had done, newest first.
 *
 * Deliberately the same row shape as the main service-records list: status
 * dot, vehicle, type and date, cost on the right. The only thing dropped is
 * the customer name, which would repeat the page header on every row.
 */
export default function OwnerServiceHistoryTab() {
  const { ownerId } = useOutletContext<OwnerOutletContext>()
  const { data, isLoading, isError, error } = useOwnerServiceHistory(ownerId, { limit: 25 })
  const apiError = asApiError(error)

  const records = data?.items
  const currency = records?.[0]?.cost?.currency ?? DEFAULT_CURRENCY

  return (
    <Card>
      {isLoading && (
        <CardBody>
          <SkeletonRows rows={5} />
        </CardBody>
      )}

      {isError && (
        <CardBody className="flex flex-col gap-2 text-sm">
          <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load service history.'}</p>
          {apiError?.requestId && (
            <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
          )}
        </CardBody>
      )}

      {records?.length === 0 && (
        <EmptyState
          icon={WrenchIcon}
          title="No service history"
          description="Jobs booked for this customer’s vehicles will appear here."
        />
      )}

      {records?.map((record) => {
        const style = STATUS_STYLES[record.status as ServiceStatus] ?? STATUS_STYLES.scheduled
        // `vehicleId` is a `Ref`: a bare id on endpoints that don't populate,
        // the document on those that do. Narrowing rather than casting means
        // the un-populated case renders the service type instead of blank.
        const vehicle = isPopulated(record.vehicleId) ? record.vehicleId : undefined

        return (
          <Link
            key={record._id}
            to={to.serviceRecordDetail(record._id)}
            className="interactive group flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-sunken"
          >
            <div className="flex min-w-0 gap-2.5">
              <span
                className="mt-1.5 h-2 w-2 flex-none rounded-full"
                style={{ background: style.color }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold group-hover:text-accent">
                  {vehicle
                    ? `${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() ||
                      vehicle.registrationNumber
                    : humanizeServiceType(record.serviceType)}
                </div>
                <div className="truncate text-xs text-text-muted">
                  {humanizeServiceType(record.serviceType)}
                  {vehicle?.registrationNumber && ` · ${vehicle.registrationNumber}`}
                  {` · ${new Date(record.serviceDate).toLocaleDateString()}`}
                </div>
              </div>
            </div>

            <div className="flex flex-none flex-col items-end gap-1">
              <span className="tabnum font-mono text-sm font-semibold">
                {formatCurrency(record.cost?.total ?? 0, record.cost?.currency ?? currency)}
              </span>
              {/* Status as text as well as colour — the dot alone is not
                  readable for anyone who can't distinguish the hues. */}
              <span className="text-[10px] font-semibold" style={{ color: style.color }}>
                {style.label}
              </span>
            </div>
          </Link>
        )
      })}
    </Card>
  )
}
