import type { ServiceStatus } from '@/features/service-records/types'
import { STATUS_ORDER, STATUS_STYLES } from './chartTokens'

interface StatusBarProps {
  data: { status: ServiceStatus; count: number }[]
  className?: string
}

/**
 * Job pipeline as a horizontal stacked bar.
 *
 * A stacked bar rather than a donut: part-to-whole comparison is a length
 * judgement, which people do accurately, versus an angle judgement, which they
 * don't — and a horizontal bar leaves room for the long status names a donut
 * would have to abbreviate or hide in a legend.
 *
 * **Colour never carries the meaning here.** Completed-vs-in-progress sits in
 * the measured 6–8 CVD band on the light surface (see chartTokens.ts), which
 * is permitted only with secondary encoding — so every segment gets a value
 * label, a legend entry with its name, and a 2px surface gap between fills.
 * Drop any of those three and the chart stops being accessible.
 */
export function StatusBar({ data, className }: StatusBarProps) {
  const byStatus = new Map(data.map((d) => [d.status, d.count]))
  const segments = STATUS_ORDER.map((status) => ({
    status,
    count: byStatus.get(status) ?? 0,
    ...STATUS_STYLES[status],
  })).filter((s) => s.count > 0)

  const total = segments.reduce((sum, s) => sum + s.count, 0)

  if (total === 0) {
    return (
      <div className={className}>
        <div className="h-3 w-full rounded-pill bg-surface-sunken" aria-hidden />
        <p className="mt-3 text-xs text-text-muted">No jobs in this period.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-pill"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(', ')}
      >
        {segments.map((segment, i) => (
          <div
            key={segment.status}
            // `gap-0.5` supplies the surface gap between fills; without it two
            // adjacent statuses read as one longer band.
            style={{
              width: `${(segment.count / total) * 100}%`,
              background: segment.color,
              animationDelay: `calc(${i * 80}ms * var(--motion-factor))`,
            }}
            className="anim-grow-x h-full first:rounded-l-pill last:rounded-r-pill"
          />
        ))}
      </div>

      {/* The legend is the secondary encoding, so it is never optional here —
          each entry pairs the swatch with the name and the count. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.status} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 flex-none rounded-[3px]"
              style={{ background: segment.color }}
              aria-hidden
            />
            <div className="min-w-0">
              <dt className="truncate text-[11px] font-medium text-text-muted">{segment.label}</dt>
              <dd className="tabnum font-mono text-sm font-semibold text-text">
                {segment.count}
                <span className="ml-1 text-[10px] font-medium text-text-faint">
                  {Math.round((segment.count / total) * 100)}%
                </span>
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}
