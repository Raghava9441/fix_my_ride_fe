import { CHART_ACCENT } from './chartTokens'

export interface BarListItem {
  label: string
  value: number
  /** Shown right-aligned as the item's headline figure. */
  display?: string
  /** Secondary figure under the label. */
  meta?: string
}

interface BarListProps {
  items: BarListItem[]
  emptyMessage?: string
  className?: string
}

/**
 * Ranked magnitude comparison — service types by job count.
 *
 * A single hue, because **length already encodes magnitude**. Giving each row
 * its own colour would imply the categories differ in kind rather than
 * quantity, and would burn a categorical palette on a chart that gains nothing
 * from one.
 *
 * Horizontal rather than vertical: category names here are multi-word
 * (`Brake service`, `Tire rotation`), and vertical columns would force them to
 * rotate or truncate. Every row is directly labelled, so there is no axis to
 * read against and no legend to cross-reference.
 */
export function BarList({ items, emptyMessage = 'No data in this period.', className }: BarListProps) {
  if (items.length === 0) {
    return <p className={`text-xs text-text-muted ${className ?? ''}`}>{emptyMessage}</p>
  }

  // Scale against the largest row, not the total: this compares items to each
  // other, and a share-of-total scale would flatten every bar once there are
  // more than a few categories.
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <ul className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-xs font-medium text-text">{item.label}</span>
            <span className="tabnum flex-none font-mono text-xs font-semibold text-text">
              {item.display ?? item.value}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken">
            <div
              className="h-full rounded-pill"
              style={{
                width: `${Math.max((item.value / max) * 100, 2)}%`,
                background: CHART_ACCENT,
              }}
            />
          </div>

          {item.meta && <span className="text-[10px] text-text-faint">{item.meta}</span>}
        </li>
      ))}
    </ul>
  )
}
