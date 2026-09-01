import { useId } from 'react'
import { CHART_ACCENT } from './chartTokens'

interface SparklineProps {
  values: number[]
  /** Rendered height in px. Width fills the container. */
  height?: number
  className?: string
  /** Sparklines are decorative context beside a number that already states it. */
  ariaHidden?: boolean
}

/**
 * The trend line inside a KPI tile.
 *
 * Intentionally has no axes, no labels, and no tooltip: the tile's number
 * carries the value and its delta carries the direction. The sparkline only
 * answers "what shape did it take getting here", and adding chrome to it would
 * make it compete with the figure it exists to support.
 */
export function Sparkline({ values, height = 34, className, ariaHidden = true }: SparklineProps) {
  const gradientId = useId()

  // Two points is the minimum that can describe a shape; below that a
  // sparkline is a horizontal line pretending to be information.
  if (values.length < 2) return <div style={{ height }} className={className} aria-hidden />

  const width = 100
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * width
    // 2px of headroom top and bottom so the stroke isn't clipped by the
    // viewBox at the extremes.
    const y = height - 2 - ((value - min) / span) * (height - 4)
    return [x, y] as const
  })

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: '100%', height, display: 'block' }}
      aria-hidden={ariaHidden}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity="0.22" />
          <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      {/* `non-scaling-stroke` keeps the line 2px however the box is stretched —
          without it, `preserveAspectRatio="none"` scales the stroke too and the
          same component looks heavier in a wide tile than a narrow one. */}
      <path
        d={line}
        fill="none"
        stroke={CHART_ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
