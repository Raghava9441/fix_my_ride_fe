import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button, Card, CardBody, EmptyState, SkeletonRows } from '@/components/ui'
import { StaffIcon } from '@/components/icons'
import { asApiError } from '@/lib/queryClient'
import { StaffRow } from '@/features/staff/components/StaffRow'
import { StaffListHeader } from '@/features/staff/components/StaffListHeader'
import { usePrefetchStaffMember } from '@/features/staff/api/queries'
import type { ServiceCenterOutletContext } from '../ServiceCenterDetailPage'
import { useServiceCenterStaff } from '../api'

const PAGE_SIZE = 20

/**
 * Who works here, using the same rows as the main staff list so a person
 * looks identical wherever you find them. Rows link to the staff profile,
 * which is where they are edited.
 */
export default function CenterStaffTab() {
  const { serviceCenterId } = useOutletContext<ServiceCenterOutletContext>()
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error, isPlaceholderData } = useServiceCenterStaff(
    serviceCenterId,
    { page, limit: PAGE_SIZE },
  )
  const prefetchStaff = usePrefetchStaffMember()
  const apiError = asApiError(error)
  const members = data?.items
  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-4">
      <Card className={isPlaceholderData ? 'opacity-60' : undefined}>
        {members && members.length > 0 ? <StaffListHeader /> : null}

        {isLoading && (
          <CardBody>
            <SkeletonRows rows={4} />
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
            title="No staff at this center"
            description="People are assigned to a center from the Staff screen."
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
    </div>
  )
}
