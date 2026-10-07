import { useOutletContext } from 'react-router-dom'
import { Card, CardBody, CardHeader, EmptyState } from '@/components/ui'
import { CardIcon } from '@/components/icons'
import { BarList, formatCurrency, humanizeServiceType, type BarListItem } from '@/components/charts'
import { asApiError } from '@/lib/queryClient'
import type { OwnerOutletContext } from '../OwnerDetailPage'
import { useOwnerExpenses } from '../api'

/**
 * What this customer has spent, split by service type.
 *
 * The endpoint answers with a total and a `breakdown` keyed by type —
 * `{ maintenance: 486 }` — so this is a composition question, not a trend
 * one: there is no time series to plot. A `BarList` is the honest rendering
 * of that shape; a line chart would need dates the API does not send, and a
 * pie would make two categories harder to compare than two bars.
 */
export default function OwnerExpensesTab() {
  const { ownerId } = useOutletContext<OwnerOutletContext>()
  const { data, isLoading, isError, error } = useOwnerExpenses(ownerId)
  const apiError = asApiError(error)

  const currency = data?.currency
  const total = data?.total ?? 0

  const items: BarListItem[] = Object.entries(data?.breakdown ?? {})
    .filter(([, value]) => typeof value === 'number')
    // Ranked, because a bar list is read top-down as "biggest first" whether
    // or not it is actually sorted — leaving it in object order would make
    // the ordering look meaningful when it is just insertion order.
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({
      label: humanizeServiceType(label),
      value,
      display: formatCurrency(value, currency),
      meta: total > 0 ? `${Math.round((value / total) * 100)}% of spend` : undefined,
    }))

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="skeleton h-40 w-full rounded-input" />
        </CardBody>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-2 text-sm">
          <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load spending.'}</p>
          {apiError?.requestId && (
            <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
          )}
        </CardBody>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CardIcon}
          title="Nothing spent yet"
          description="Once this customer is invoiced for a job, the breakdown appears here."
        />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Spending by service type"
        description="Across every job on this customer’s vehicles."
        actions={
          <span className="tabnum font-mono text-lg font-semibold text-text">
            {formatCurrency(total, currency)}
          </span>
        }
      />
      <CardBody>
        <BarList items={items} />
      </CardBody>
    </Card>
  )
}
