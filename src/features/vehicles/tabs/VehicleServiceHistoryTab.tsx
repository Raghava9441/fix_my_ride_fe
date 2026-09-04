import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from '@/components/ui'
import { WrenchIcon } from '@/components/icons'
import { DEFAULT_CURRENCY, STATUS_STYLES, formatCurrency, humanizeServiceType } from '@/components/charts'
import { asApiError } from '@/lib/queryClient'
import { to } from '@/lib/routing'
import { useVehicleServiceRecords } from '../api'
import type { VehicleOutletContext } from '../VehicleDetailPage'

const PAGE_SIZE = 10

export default function VehicleServiceHistoryTab() {
  const { vehicleId } = useOutletContext<VehicleOutletContext>()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, isPlaceholderData } = useVehicleServiceRecords(vehicleId, {
    page,
    limit: PAGE_SIZE,
  })

  const apiError = asApiError(error)
  const records = data?.items ?? []
  const pagination = data?.pagination

  // Running total across the visible page, so the numbers add up to what's
  // on screen rather than to a figure the user can't verify.
  const pageTotal = records.reduce((sum, record) => sum + (record.cost?.total ?? 0), 0)
  const currency = records[0]?.cost?.currency ?? DEFAULT_CURRENCY

  return (
    <Card className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
      <CardHeader
        title="Service history"
        description="Every job recorded against this vehicle."
        actions={
          pagination && pagination.total > 0 ? (
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{pagination.total} jobs</Badge>
              {pageTotal > 0 && (
                <span className="tabnum font-mono text-xs text-text-muted">
                  {formatCurrency(pageTotal, currency)} this page
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      <CardBody className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-14 rounded-input" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-4">
            <p className="text-sm text-critical">
              {apiError?.userMessage ?? 'Couldn’t load service history.'}
            </p>
            {apiError?.requestId && (
              <p className="mt-1 font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={WrenchIcon}
            title="No service history"
            description="Jobs booked against this vehicle will appear here."
          />
        ) : (
          <ul>
            {records.map((record) => {
              const style = STATUS_STYLES[record.status]
              return (
                <li key={record._id} className="border-b border-border last:border-b-0">
                  <Link
                    to={to.serviceRecordDetail(record._id)}
                    className="interactive flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface-sunken"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 flex-none rounded-full"
                        style={{ background: style.color }}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {humanizeServiceType(record.serviceType)}
                        </div>
                        <div className="truncate text-xs text-text-muted">
                          {new Date(record.serviceDate).toLocaleDateString()}
                          {record.odometerReading?.value != null &&
                            ` · ${record.odometerReading.value.toLocaleString()} ${record.odometerReading.unit ?? 'km'}`}
                        </div>
                        {record.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                            {record.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-none flex-col items-end gap-1">
                      <span className="tabnum font-mono text-sm font-semibold">
                        {formatCurrency(record.cost?.total ?? 0, record.cost?.currency ?? currency)}
                      </span>
                      {/* Status as text as well as colour. */}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-xs text-text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.hasPrevious}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
