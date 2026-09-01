import { useId, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CHART_ACCENT, CHART_INK, formatCompactCurrency, formatShortDate, niceScale } from './chartTokens'

export interface TrendPoint {
  date: string
  value: number
  /** Secondary figure shown in the tooltip only — never given its own axis. */
  secondary?: number
}

interface TrendAreaChartProps {
  points: TrendPoint[]
  /** Height of the plot area itself; axis labels sit outside it. */
  height?: number
  /** Formats the y-axis ticks and the tooltip's primary figure. */
  format?: (value: number) => string
  secondaryLabel?: string
  valueLabel?: string
  className?: string
}

/** Room for the y-axis labels and the date row, in CSS pixels. */
const AXIS_WIDTH = 52
const AXIS_HEIGHT = 20

/**
 * The dashboard's primary chart: one measure over time.
 *
 * **One series, one axis.** Job count travels with each point and appears in
 * the tooltip, but it never gets a second y-scale — a dual-axis chart lets the
 * author decide where the two lines cross, which makes any apparent
 * relationship an artifact of the scaling rather than a fact about the data.
 * Job count has its own KPI tile and sparkline instead.
 *
 * A single series needs no legend: the card title names it.
 *
 * ---- Why the labels are HTML and only the geometry is SVG ----
 *
 * The plot stretches to its container with `preserveAspectRatio="none"`, which
 * is what lets it fill any width without a resize observer. That also scales
 * anything drawn *inside* the SVG — including text. At phone width the 720-unit
 * space compresses to ~330px, so 10px SVG labels rendered at under 5px and were
 * genuinely unreadable. Labels are therefore positioned as HTML over the plot,
 * where a pixel is a pixel at every size; the SVG draws only lines and fills,
 * which are supposed to stretch.
 */
export function TrendAreaChart({
  points,
  height = 220,
  format = (v) => formatCompactCurrency(v),
  secondaryLabel = 'Jobs',
  valueLabel = 'Revenue',
  className,
}: TrendAreaChartProps) {
  const gradientId = useId()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Internal coordinate space. Only geometry lives here, so the numbers are
  // arbitrary — they just need enough resolution for a year of daily points.
  const VB_W = 720
  const VB_H = 240

  const geometry = useMemo(() => {
    if (points.length === 0) return null

    const max = Math.max(...points.map((p) => p.value), 0)
    const allZero = max === 0

    // Snapped to a round step so the axis reads 0 / 150 / 300 / 450 / 600
    // rather than 0 / 140 / 279 / 419 / 559.
    const { ceiling } = niceScale(max, 4)

    const xFor = (i: number) =>
      points.length === 1 ? VB_W / 2 : (i / (points.length - 1)) * VB_W
    const yFor = (value: number) => VB_H - (value / ceiling) * VB_H

    const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), point: p }))
    const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ')
    const area = `${line} L${coords[coords.length - 1].x.toFixed(2)},${VB_H} L${coords[0].x.toFixed(2)},${VB_H} Z`

    /*
     * A flat-zero series has a nominal ceiling of 1, so five evenly spaced
     * ticks all round to the same label — an axis reading "$1 $1 $1 $1 $0"
     * looks broken. With no data there is nothing to read against, so it gets
     * a single baseline tick.
     */
    const fractions = allZero ? [0] : [0, 0.25, 0.5, 0.75, 1]
    const ticks = fractions.map((t) => ({ value: ceiling * t, topPct: (1 - t) * 100 }))

    // Both ends of a year-long axis land in the same month name, so the year
    // has to appear or the axis misrepresents its span.
    const spansYears =
      points.length > 1 && points[0].date.slice(0, 4) !== points[points.length - 1].date.slice(0, 4)

    return { coords, line, area, ticks, spansYears, allZero }
  }, [points])

  if (!geometry) return null

  const { coords, line, area, ticks, spansYears } = geometry

  // Nearest-point lookup rather than exact hit-testing: the pointer only has
  // to land in the right column, which makes a 2px line a comfortable target
  // on a touch screen.
  const handlePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    let nearest = 0
    let best = Infinity
    for (let i = 0; i < coords.length; i++) {
      const distance = Math.abs(coords[i].x / VB_W - ratio)
      if (distance < best) {
        best = distance
        nearest = i
      }
    }
    setActiveIndex(nearest)
  }

  const active = activeIndex === null ? null : coords[activeIndex]
  const activeLeftPct = active ? (active.x / VB_W) * 100 : 0
  const activeTopPct = active ? (active.y / VB_H) * 100 : 0
  // Flip the tooltip near the right edge so it never runs outside the card.
  const tooltipFlips = activeLeftPct > 62

  return (
    <div className={className} style={{ paddingLeft: AXIS_WIDTH, paddingBottom: AXIS_HEIGHT }}>
      <div style={{ position: 'relative', height }}>
        {/* y-axis labels, in real pixels outside the stretched plot */}
        {ticks.map((tick) => (
          <span
            key={tick.topPct}
            className="tabnum pointer-events-none absolute text-[10px] text-text-faint"
            style={{
              right: '100%',
              marginRight: 8,
              top: `${tick.topPct}%`,
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
            }}
          >
            {format(tick.value)}
          </span>
        ))}

        <div
          style={{ position: 'relative', height: '100%', touchAction: 'pan-y' }}
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
            role="img"
            aria-label={`${valueLabel} over time`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity="0.26" />
                <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Recessive grid — horizontal only. Vertical rules would add ink
                without helping anyone read a value off the y-axis. */}
            {ticks.map((tick) => {
              const y = (tick.topPct / 100) * VB_H
              return (
                <line
                  key={tick.topPct}
                  x1={0}
                  x2={VB_W}
                  y1={y}
                  y2={y}
                  stroke={CHART_INK.grid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}

            <path d={area} fill={`url(#${gradientId})`} />
            {/* `non-scaling-stroke` keeps this 2px at any container width;
                without it the same chart looks heavier when it's wider. */}
            <path
              d={line}
              fill="none"
              stroke={CHART_ACCENT}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {active && (
              <line
                x1={active.x}
                x2={active.x}
                y1={0}
                y2={VB_H}
                stroke={CHART_INK.grid}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* The marker is HTML for the same reason as the labels: a circle in
              a stretched viewBox renders as an ellipse. */}
          {active && (
            <span
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${activeLeftPct}%`,
                top: `${activeTopPct}%`,
                width: 10,
                height: 10,
                transform: 'translate(-50%, -50%)',
                background: CHART_ACCENT,
                // A surface ring separates the marker from the line and fill.
                boxShadow: '0 0 0 2px var(--surface-raised)',
              }}
              aria-hidden
            />
          )}

          {active && (
            <div
              className="pointer-events-none absolute z-10 rounded-input border border-border bg-surface-overlay px-2.5 py-1.5 shadow-[var(--shadow-overlay)]"
              style={{
                left: `${activeLeftPct}%`,
                top: 0,
                transform: tooltipFlips ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)',
                minWidth: 116,
              }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
                {formatShortDate(active.point.date, spansYears)}
              </div>
              <div className="tabnum mt-0.5 font-mono text-sm font-semibold text-text">
                {format(active.point.value)}
              </div>
              {active.point.secondary !== undefined && (
                <div className="tabnum text-xs text-text-muted">
                  {active.point.secondary} {secondaryLabel.toLowerCase()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* First and last date only. Labelling every point on a 30-day series
            guarantees collisions at phone width. */}
        {coords.length > 1 && (
          <div
            className="absolute flex w-full justify-between text-[10px] text-text-faint"
            style={{ top: '100%', marginTop: 6 }}
          >
            <span>{formatShortDate(coords[0].point.date, spansYears)}</span>
            <span>{formatShortDate(coords[coords.length - 1].point.date, spansYears)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
