import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'
import { Card } from '@/components/ui'
import { Sparkline } from '@/components/charts'
import type { KpiDelta } from '@/features/reports/types'

interface KpiTileProps {
  label: string
  kpi: KpiDelta | undefined
  format?: (value: number) => string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  trend?: number[]
  loading?: boolean
  /** Set when a rise is bad (e.g. cancellations), so the colour flips. */
  inverse?: boolean
}

/**
 * One headline number, its direction, and the shape it took getting there.
 *
 * The delta is the point of this component. A number with no comparison can't
 * be acted on — "₹486" means nothing without knowing it was ₹0 last month —
 * so every tile carries the same measure over the preceding window.
 *
 * Direction is never colour-alone: the arrow glyph and the sign both carry it,
 * which keeps the tile readable in the colour-vision modes and in print.
 */
export function KpiTile({
  label,
  kpi,
  format = (v) => v.toLocaleString(),
  icon: Icon,
  trend,
  loading,
  inverse,
}: KpiTileProps) {
  const change = kpi?.changePct ?? null
  const rising = change !== null && change > 0
  const falling = change !== null && change < 0
  const good = inverse ? falling : rising

  return (
    <Card className="group relative overflow-hidden p-4">
      {/* A very low-opacity accent wash that lifts on hover. Decorative only —
          it encodes nothing, so it stays well below text contrast. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'linear-gradient(135deg, var(--accent-bg), transparent 60%)' }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-2">
        {/*
          Two lines are reserved for the label whether or not it wraps. At
          phone width "Avg. repair order" wraps and its neighbour doesn't,
          which pushed the two values in that row out of alignment — the
          numbers are meant to be scannable across the row.
        */}
        <div className="flex min-h-[2.4em] items-start justify-between gap-2">
          <span className="text-[11px] font-bold uppercase leading-tight tracking-wide text-text-faint">
            {label}
          </span>
          {Icon && (
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-[6px] bg-accent-bg text-accent">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        {loading ? (
          <div className="skeleton h-8 w-24" />
        ) : (
          <div className="tabnum font-mono text-2xl font-semibold leading-none text-text">
            {format(kpi?.value ?? 0)}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs">
          {change === null ? (
            // A jump from zero is "new", not an infinite percentage.
            <span className="text-text-faint">
              {kpi && kpi.value > 0 ? 'New this period' : 'No change'}
            </span>
          ) : (
            <>
              <span
                className={clsx(
                  'inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-[11px] font-bold',
                  change === 0
                    ? 'bg-surface-sunken text-text-muted'
                    : good
                      ? 'bg-success-bg text-success'
                      : 'bg-critical-bg text-critical',
                )}
              >
                <span aria-hidden>{change === 0 ? '→' : rising ? '↑' : '↓'}</span>
                {Math.abs(change)}%
              </span>
              <span className="truncate text-text-faint">vs previous</span>
            </>
          )}
        </div>

        {trend && trend.length > 1 && <Sparkline values={trend} height={30} className="mt-1" />}
      </div>
    </Card>
  )
}
