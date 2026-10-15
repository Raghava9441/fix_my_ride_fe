import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  SegmentedControl,
  SkeletonRows,
  type SegmentedOption,
} from '@/components/ui'
import { BuildingIcon, SearchIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useServiceCenters, usePrefetchServiceCenter } from './api'
import { ServiceCenterRow } from './components/ServiceCenterRow'
import { ServiceCenterListHeader } from './components/ServiceCenterListHeader'
import { CreateServiceCenterDialog } from './components/CreateServiceCenterDialog'
import { SUBSCRIPTION_STATUS, SUBSCRIPTION_STATUS_ORDER } from './serviceCenter'
import type { SubscriptionStatus } from './types'

const PAGE_SIZE = 20

type StatusFilter = SubscriptionStatus | 'all'

/**
 * Every workshop in the workspace.
 *
 * Unlike staff, this defaults to *all* plans: a workspace has a handful of
 * centers, and a filtered default would hide a lapsed one exactly when
 * someone opens this screen to find out why it stopped working.
 */
export default function ServiceCentersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, error, isPlaceholderData } = useServiceCenters({
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  })

  const prefetchCenter = usePrefetchServiceCenter()
  const apiError = asApiError(error)
  const centers = data?.items
  const pagination = data?.pagination

  const statusOptions: SegmentedOption<StatusFilter>[] = [
    { value: 'all', label: 'All' },
    ...SUBSCRIPTION_STATUS_ORDER.map((value) => ({
      value: value as StatusFilter,
      label: SUBSCRIPTION_STATUS[value].label,
    })),
  ]

  function resetToFirstPage<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value)
      // A changed result set makes the old page number meaningless.
      setPage(1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Service centers"
        description="Every workshop in your workspace, with its staff, services and plan."
        meta={pagination && <Badge tone="neutral">{pagination.total} total</Badge>}
        actions={
          <Can rule={access.permission(PERMISSIONS.serviceCenter.manage)} mode="disable">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              Add center
            </Button>
          </Can>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input
            type="search"
            value={search}
            onChange={(e) => resetToFirstPage(setSearch)(e.target.value)}
            placeholder="Search name, email, or city"
            aria-label="Search service centers"
            className="interactive w-full rounded-input border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-accent"
          />
        </div>

        <SegmentedControl
          legend="Plan"
          options={statusOptions}
          value={status}
          onChange={resetToFirstPage(setStatus)}
        />
      </div>

      <Card className={isPlaceholderData ? 'opacity-60' : undefined}>
        {centers && centers.length > 0 ? <ServiceCenterListHeader /> : null}

        {isLoading && (
          <CardBody>
            <SkeletonRows rows={5} />
          </CardBody>
        )}

        {isError && (
          <CardBody className="flex flex-col gap-2 text-sm">
            <p className="text-critical">
              {apiError?.userMessage ?? 'Couldn’t load service centers.'}
            </p>
            {apiError?.requestId && (
              <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </CardBody>
        )}

        {centers?.length === 0 && (
          <EmptyState
            icon={BuildingIcon}
            title={debouncedSearch || status !== 'all' ? 'No matches' : 'No service centers yet'}
            description={
              debouncedSearch
                ? `Nothing matched “${debouncedSearch}”. Try a city or an email address.`
                : status !== 'all'
                  ? `No center is on the “${SUBSCRIPTION_STATUS[status].label}” plan state. Try another filter.`
                  : 'Add your first workshop to start assigning staff and service records.'
            }
            action={
              !debouncedSearch &&
              status === 'all' && (
                <Can rule={access.permission(PERMISSIONS.serviceCenter.manage)}>
                  <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                    Add the first one
                  </Button>
                </Can>
              )
            }
          />
        )}

        {centers?.map((center) => (
          <ServiceCenterRow
            key={center._id}
            center={center}
            onPrefetch={() => prefetchCenter(center._id)}
          />
        ))}
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

      <CreateServiceCenterDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
