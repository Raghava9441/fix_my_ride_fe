import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, CardBody, EmptyState, SkeletonRows } from '@/components/ui'
import { PersonIcon, SearchIcon } from '@/components/icons'
import { asApiError } from '@/lib/queryClient'
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue'
import { useOwners } from './api'
import { CustomerRow } from './components/CustomerRow'
import { CustomerListHeader } from './components/CustomerListHeader'
import { usePrefetchOwner } from './api/queries'

const PAGE_SIZE = 20

/**
 * Customers.
 *
 * "Customers" on screen, `owners` in the API — see `customer.ts` for why the
 * two names coexist rather than one being translated into the other.
 *
 * The list is deliberately denser than the vehicles list. A vehicle row has
 * two facts worth scanning; a customer row has six, and the question people
 * bring to this screen ("who spends the most", "who has the most vehicles",
 * "who is this phone number") is answered by comparing rows rather than by
 * opening one. That only works if the figures line up in columns, which is
 * what `CustomerRow` re-templates to at `lg`.
 */
export default function OwnersPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  /*
   * Debounced here, not in the query. The delay is a UI decision — how long
   * to wait after a keystroke — while making sure the newest term wins is
   * the query layer's job, handled by the per-key AbortSignal in
   * `useOwners`. Splitting it that way means the race stays fixed even if a
   * future caller forgets to debounce.
   */
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, error, isPlaceholderData } = useOwners({
    q: debouncedSearch || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const prefetchOwner = usePrefetchOwner()
  const apiError = asApiError(error)
  const customers = data?.items
  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Customers"
        description="Everyone with a vehicle registered to one of your centers."
        meta={pagination && <Badge tone="neutral">{pagination.total} total</Badge>}
      />

      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            // Any new term invalidates the page cursor — page 3 of the old
            // result set is meaningless against the new one.
            setPage(1)
          }}
          placeholder="Search name, email, or phone"
          aria-label="Search customers"
          className="interactive w-full rounded-input border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-accent"
        />
      </div>

      {/* Dimmed rather than replaced while the next page loads, so the
          current page stays readable instead of flashing to a skeleton. */}
      <Card className={isPlaceholderData ? 'opacity-60' : undefined}>
        {customers && customers.length > 0 ? <CustomerListHeader /> : null}

        {isLoading && (
          <CardBody>
            <SkeletonRows rows={6} />
          </CardBody>
        )}

        {isError && (
          <CardBody className="flex flex-col gap-2 text-sm">
            {/* `userMessage`, not the raw server message: a 500's text can
                carry internals, and every error kind gets a sentence that
                says what to do next. */}
            <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load customers.'}</p>
            {apiError?.requestId && (
              <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
            )}
          </CardBody>
        )}

        {customers?.length === 0 && (
          <EmptyState
            icon={PersonIcon}
            title={debouncedSearch ? 'No matches' : 'No customers yet'}
            description={
              debouncedSearch
                ? `Nothing matched “${debouncedSearch}”. Try a name, email address, or phone number.`
                : 'Customers appear here once a vehicle is registered to them, or once they accept an invitation to your workspace.'
            }
          />
        )}

        {customers?.map((owner) => (
          <CustomerRow key={owner._id} owner={owner} onPrefetch={() => prefetchOwner(owner._id)} />
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
    </div>
  )
}
