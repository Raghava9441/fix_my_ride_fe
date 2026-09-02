import type { ReactNode } from 'react'
import clsx from 'clsx'

export interface DescriptionItem {
  label: string
  value: ReactNode
  /** Renders across the full width — for addresses and notes. */
  wide?: boolean
}

/**
 * Label/value pairs for a record's specification.
 *
 * A real `<dl>` rather than a grid of `<div>`s: the association between a
 * label and its value is then in the markup, so a screen reader reads
 * "Fuel type, petrol" instead of two unrelated strings.
 *
 * A missing value renders an em dash rather than collapsing the row, so the
 * shape of the record stays constant and you can see at a glance what hasn't
 * been filled in.
 */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: DescriptionItem[]
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <dl
      className={clsx(
        'grid gap-x-6 gap-y-3.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className={clsx('min-w-0', item.wide && 'sm:col-span-full')}>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-text">
            {item.value === null || item.value === undefined || item.value === '' ? (
              <span className="text-text-faint">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
