import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  SelectInput,
  SkeletonRows,
} from '@/components/ui'
import { WrenchIcon } from '@/components/icons'
import { STATUS_STYLES, formatCurrency, humanizeServiceType } from '@/components/charts'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { isPopulated } from '@/lib/api'
import { asApiError } from '@/lib/queryClient'
import { to } from '@/lib/routing'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useServiceRecords, usePrefetchServiceRecord } from './api'
import { CreateServiceRecordDialog } from './components/CreateServiceRecordDialog'
import type { ServiceStatus, ServiceType } from './types'

const PAGE_SIZE = 20

const STATUSES: { value: ServiceStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const TYPES: { value: ServiceType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'oil_change', label: 'Oil change' },
  { value: 'brake_service', label: 'Brake service' },
  { value: 'tire_rotation', label: 'Tire rotation' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
]

export default function ServiceRecordsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ServiceStatus | ''>('')
  const [serviceType, setServiceType] = useState<ServiceType | ''>('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, error, isPlaceholderData } = useServiceRecords({
    q: debouncedSearch || undefined,
    status: status || undefined,
    serviceType: serviceType || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const prefetch = usePrefetchServiceRecord()
  const apiError = asApiError(error)
  const records = data?.items ?? []
  const pagination = data?.pagination

  // Any filter change invalidates the current page number — staying on page 4
  // of a result set that now has one page shows an empty list.
  const resetTo = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const currency = records[0]?.cost?.currency ?? 'USD'
  const pageTotal = records.reduce((sum, r) => sum + (r.cost?.total ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Service records"
        description="Every job logged against a vehicle."
        meta={
          pagination && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{pagination.total} total</Badge>
              {pageTotal > 0 && (
                <span className="tabnum font-mono text-xs text-text-muted">
                  {formatCurrency(pageTotal, currency)} this page
                </span>
              )}
            </div>
          )
        }
        actions={
          <Can rule={access.permission(PERMISSIONS.serviceRecord.create)} mode="disable">
            <Button size="sm" onClick={() => setCreating(true)}>
              Log a job
            </Button>
          </Can>
        }
      />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => resetTo(setSearch)(e.target.value)}
          placeholder="Search description or invoice"
          aria-label="Search service records"
          className="interactive min-w-0 flex-1 rounded-input border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent sm:max-w-xs"
        />

        <SelectInput
          aria-label="Filter by status"
          value={status}
          onChange={(e) => resetTo(setStatus)(e.target.value as ServiceStatus | '')}
          className="w-auto"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectInput>

        <SelectInput
          aria-label="Filter by service type"
          value={serviceType}
          onChange={(e) => resetTo(setServiceType)(e.target.value as ServiceType | '')}
          className="w-auto"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectInput>
      </div>

      <Card className={isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
        {isLoading && (
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        )}

        {isError && (
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm text-critical">
              {apiError?.userMessage ?? 'Couldn’t load service records.'}
            </p>
            {apiError?.requestId && (
              <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </CardBody>
        )}

        {!isLoading && !isError && records.length === 0 && (
          <EmptyState
            icon={WrenchIcon}
            title={debouncedSearch || status || serviceType ? 'No matches' : 'No service records'}
            description={
              debouncedSearch || status || serviceType
                ? 'Try clearing a filter.'
                : 'Jobs appear here as they’re booked in against a vehicle.'
            }
            action={
              !debouncedSearch &&
              !status &&
              !serviceType && (
                <Can rule={access.permission(PERMISSIONS.serviceRecord.create)}>
                  <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                    Log the first job
                  </Button>
                </Can>
              )
            }
          />
        )}

        {records.map((record) => {
          const style = STATUS_STYLES[record.status]
          const vehicle = isPopulated(record.vehicleId) ? record.vehicleId : null

          return (
            <Link
              key={record._id}
              to={to.serviceRecordDetail(record._id)}
              onMouseEnter={() => prefetch(record._id)}
              onFocus={() => prefetch(record._id)}
              className="interactive flex items-start justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-sunken"
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className="mt-1.5 h-2 w-2 flex-none rounded-full"
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
                    {` · ${new Date(record.serviceDate).toLocaleDateString()}`}
                  </div>
                  {record.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-text-muted">{record.description}</p>
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
          )
        })}
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
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

      <CreateServiceRecordDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
