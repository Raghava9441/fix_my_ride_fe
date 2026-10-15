import { useOutletContext } from 'react-router-dom'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  type DescriptionItem,
} from '@/components/ui'
import { WrenchIcon } from '@/components/icons'
import { formatCurrency } from '@/components/charts'
import { asApiError } from '@/lib/queryClient'
import type { ServiceCenterOutletContext } from '../ServiceCenterDetailPage'
import {
  useServiceCenter,
  useServiceCenterReviews,
  useServiceCenterServices,
} from '../api'
import { BUSINESS_DAYS, centerStatus, dayLabel, formatAddress, safeWebsite } from '../serviceCenter'

/**
 * Contact details, opening hours, the service catalogue and recent reviews.
 *
 * Everything here is read-only; editing lives behind Manage (details) and the
 * Settings tab (hours, catalogue).
 */
export default function CenterOverviewTab() {
  const { serviceCenterId } = useOutletContext<ServiceCenterOutletContext>()
  const { data: center } = useServiceCenter(serviceCenterId)
  const services = useServiceCenterServices(serviceCenterId)
  const reviews = useServiceCenterReviews(serviceCenterId, { limit: 5 })

  if (!center) return null

  const status = centerStatus(center)
  const website = safeWebsite(center.website)
  const currency = center.settings?.currency
  const hours = center.settings?.businessHours

  const details: DescriptionItem[] = [
    { label: 'Plan', value: status ? <Badge tone={status.tone}>{status.label}</Badge> : '—' },
    { label: 'Registration no.', value: center.businessRegistrationNumber || '—' },
    { label: 'Email', value: <a className="text-accent" href={`mailto:${center.email}`}>{center.email}</a> },
    { label: 'Phone', value: center.phone || '—' },
    {
      label: 'Website',
      value: website ? (
        <a className="text-accent" href={website} target="_blank" rel="noreferrer noopener">
          {center.website}
        </a>
      ) : (
        '—'
      ),
    },
    { label: 'Added', value: new Date(center.createdAt).toLocaleDateString() },
    { label: 'Address', value: formatAddress(center.address) ?? '—', wide: true },
  ]

  const catalogue = services.data ?? []
  const reviewItems = reviews.data?.items ?? []
  const reviewError = asApiError(reviews.error)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Details" />
        <CardBody>
          <DescriptionList items={details} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Opening hours"
          description={center.settings?.timezone ? `Times in ${center.settings.timezone}.` : undefined}
        />
        <CardBody>
          {hours && Object.keys(hours).length > 0 ? (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {BUSINESS_DAYS.map((day) => {
                const entry = hours[day]
                const open = entry && !entry.closed && entry.open && entry.close
                return (
                  <li key={day} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <span className="text-text-muted">{dayLabel(day)}</span>
                    {open ? (
                      <span className="tabnum font-mono text-text">
                        {entry.open}–{entry.close}
                      </span>
                    ) : (
                      <span className="text-text-faint">Closed</span>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No opening hours recorded yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Services offered"
          description="What this center advertises to customers."
        />
        {services.isLoading ? (
          <CardBody>
            <div className="skeleton h-24 w-full rounded-input" />
          </CardBody>
        ) : catalogue.length > 0 ? (
          <ul className="divide-y divide-border">
            {catalogue.map((service, index) => (
              <li
                key={service._id ?? index}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text">
                    {service.name ?? 'Unnamed service'}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {[service.category, service.duration ? `${service.duration} min` : undefined]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {service.basePrice != null ? (
                    <span className="tabnum font-mono text-sm text-text-muted">
                      {formatCurrency(service.basePrice, currency)}
                    </span>
                  ) : null}
                  {!service.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={WrenchIcon}
            title="No services listed"
            description="Add the services this center offers from the Settings tab."
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Recent reviews" />
        {reviews.isLoading ? (
          <CardBody>
            <div className="skeleton h-24 w-full rounded-input" />
          </CardBody>
        ) : reviews.isError ? (
          <CardBody className="text-sm text-critical">
            {reviewError?.userMessage ?? 'Couldn’t load reviews.'}
          </CardBody>
        ) : reviewItems.length > 0 ? (
          <ul className="divide-y divide-border">
            {reviewItems.map((review) => (
              <li key={review._id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-text">
                    {review.authorName ?? 'Customer'}
                  </span>
                  <span className="tabnum font-mono text-sm text-text-muted">
                    {review.rating.toFixed(1)}★
                  </span>
                </div>
                {review.comment ? (
                  <p className="text-sm text-text-muted">{review.comment}</p>
                ) : null}
                <span className="text-[11px] text-text-faint">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reviews yet" description="Customer reviews will appear here." />
        )}
      </Card>
    </div>
  )
}
