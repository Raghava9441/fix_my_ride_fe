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
import { SearchIcon, StaffIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useStaffList } from './api'
import { usePrefetchStaffMember } from './api/queries'
import { StaffRow } from './components/StaffRow'
import { StaffListHeader } from './components/StaffListHeader'
import { AddStaffDialog } from './components/AddStaffDialog'
import { EMPLOYMENT_STATUS, EMPLOYMENT_STATUS_ORDER } from './staffMember'
import type { EmploymentStatus } from './types'

const PAGE_SIZE = 20

type StatusFilter = EmploymentStatus | 'all'

/**
 * The team.
 *
 * The status filter is the one control this list genuinely needs. A staff
 * list accumulates people who have left — `terminated` records are kept for
 * the service history that points at them — so an unfiltered list gets
 * steadily less useful over time. It defaults to `active`, which is what
 * someone opening this screen almost always means, with the full set one
 * click away rather than hidden behind a menu.
 */
export default function StaffPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, error, isPlaceholderData } = useStaffList({
    q: debouncedSearch || undefined,
    employmentStatus: status === 'all' ? undefined : status,
    page,
    limit: PAGE_SIZE,
  })

  const prefetchStaff = usePrefetchStaffMember()
  const apiError = asApiError(error)
  const members = data?.items
  const pagination = data?.pagination

  const statusOptions: SegmentedOption<StatusFilter>[] = [
    { value: 'all', label: 'All' },
    ...EMPLOYMENT_STATUS_ORDER.map((value) => ({
      value: value as StatusFilter,
      label: EMPLOYMENT_STATUS[value].label,
    })),
  ]

  function resetToFirstPage<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value)
      // Any change to the result set invalidates the cursor — page 3 of the
      // old set is meaningless against the new one.
      setPage(1)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Staff"
        description="Everyone working across your service centers."
        meta={pagination && <Badge tone="neutral">{pagination.total} total</Badge>}
        actions={
          <Can rule={access.permission(PERMISSIONS.staffProfile.create)} mode="disable">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              Add staff
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
            placeholder="Search name, email, or employee ID"
            aria-label="Search staff"
            className="interactive w-full rounded-input border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-accent"
          />
        </div>

        {/* Wraps to a second row on a phone rather than scrolling. Five
            short pills fit in two rows, and a wrapped row shows every option
            at once where a scrolling one hides the ones that matter least
            precisely when the viewport is smallest. */}
        <SegmentedControl
          legend="Status"
          options={statusOptions}
          value={status}
          onChange={resetToFirstPage(setStatus)}
        />
      </div>

      <Card className={isPlaceholderData ? 'opacity-60' : undefined}>
        {members && members.length > 0 ? <StaffListHeader /> : null}

        {isLoading && (
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        )}

        {isError && (
          <CardBody className="flex flex-col gap-2 text-sm">
            <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load staff.'}</p>
            {apiError?.requestId && (
              <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </CardBody>
        )}

        {members?.length === 0 && (
          <EmptyState
            icon={StaffIcon}
            title={debouncedSearch ? 'No matches' : status === 'all' ? 'No staff yet' : 'Nobody here'}
            description={
              debouncedSearch
                ? `Nothing matched “${debouncedSearch}”. Try an email address or employee ID.`
                : status === 'all'
                  ? 'Add someone to give them access to a service center.'
                  : `Nobody is currently marked “${EMPLOYMENT_STATUS[status].label}”. Try another filter.`
            }
            action={
              !debouncedSearch &&
              status === 'all' && (
                <Can rule={access.permission(PERMISSIONS.staffProfile.create)}>
                  <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                    Add the first one
                  </Button>
                </Can>
              )
            }
          />
        )}

        {members?.map((staff) => (
          <StaffRow key={staff._id} staff={staff} onPrefetch={() => prefetchStaff(staff._id)} />
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

      <AddStaffDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
