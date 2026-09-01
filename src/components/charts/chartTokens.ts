import type { ServiceStatus } from '@/features/service-records/types'

/**
 * The design system's parameters, expressed for charts.
 *
 * Charts read the same `data-*`-driven tokens as the rest of the app, so a
 * theme, accent, contrast, or color-vision change repaints them for free —
 * that is the whole reason these are `var()` references and not hex.
 *
 * ---- Color decisions, and the evidence for them ----
 *
 * Most charts here are **single-hue**: the revenue trend is one series and the
 * type breakdown encodes magnitude by bar length, so neither needs a
 * categorical palette. That is deliberate — a categorical palette is for when
 * the series *are* the subject, and reaching for one where a single hue works
 * is how charts become harder to read, not easier.
 *
 * The one multi-color chart is job status, which uses the reserved status
 * tokens (status is a state, not a series). Validated with the palette checker
 * against both surfaces:
 *
 *   dark   — passes outright (protan ΔE 8.4, normal-vision 16.1)
 *   light  — completed↔in-progress sits at protan ΔE 7.3, inside the 6–8 band
 *
 * Green-vs-amber is the classic protan confusion pair and saturating the green
 * makes it *worse* (measured: 7.3 → 6.2), so the band is accepted with the
 * secondary encoding the method requires and `StatusBar` ships: a direct value
 * label on every segment, a text legend, and 2px surface gaps between fills.
 * Colour never carries the meaning alone.
 *
 * Readers who need more than that have a real escape hatch: the app's
 * color-vision axis re-hues success to blue, which clears the pair outright
 * (protan ΔE 14.6, also measured).
 */

/** Chart ink. Text never wears a series color — identity comes from the mark. */
export const CHART_INK = {
  text: 'var(--text)',
  muted: 'var(--text-muted)',
  faint: 'var(--text-faint)',
  /** Grid and axes stay recessive; they orient, they don't compete. */
  grid: 'var(--border)',
  surface: 'var(--surface-raised)',
} as const

/** Single-series hue, following the user's accent choice. */
export const CHART_ACCENT = 'var(--accent)'

export interface StatusStyle {
  label: string
  color: string
  /** Tint for the tile background behind a status count. */
  bg: string
}

/**
 * Job status → color and label.
 *
 * Ordered as the work actually flows (scheduled → in progress → completed,
 * with cancelled last), so a stacked bar reads left-to-right as a pipeline
 * rather than in arbitrary order.
 */
export const STATUS_STYLES: Record<ServiceStatus, StatusStyle> = {
  scheduled: { label: 'Scheduled', color: 'var(--info)', bg: 'var(--info-bg)' },
  in_progress: { label: 'In progress', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  completed: { label: 'Completed', color: 'var(--success)', bg: 'var(--success-bg)' },
  // Deliberately neutral: a cancelled job is de-emphasised, and a gray that
  // "reads as gray" is correct here rather than a palette failure.
  cancelled: { label: 'Cancelled', color: 'var(--text-faint)', bg: 'var(--surface-sunken)' },
}

export const STATUS_ORDER: ServiceStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']

/** `oil_change` → `Oil change`. */
export function humanizeServiceType(type: string): string {
  const spaced = type.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Compact currency for axis ticks and tiles: 12400 → "₹12.4k".
 *
 * Charts need the short form so labels don't collide; the tooltip shows the
 * exact figure, which is where precision belongs.
 */
export function formatCompactCurrency(value: number, currency = 'INR'): string {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : ''
  const abs = Math.abs(value)

  if (abs >= 10_000_000) return `${symbol}${(value / 10_000_000).toFixed(1)}Cr`
  if (abs >= 100_000) return `${symbol}${(value / 100_000).toFixed(1)}L`
  if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}k`
  return `${symbol}${Math.round(value)}`
}

export function formatCurrency(value: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    // An unrecognised currency code shouldn't blank out a KPI tile.
    return `${value.toLocaleString()}`
  }
}

/**
 * `2026-07-27` → `27 Jul`, for axis ticks.
 *
 * `withYear` is not cosmetic: on a 365-day range both ends of the axis land in
 * the same month name and read identically ("Sep 1" … "Sep 1"), which makes
 * the axis actively misleading about the span it covers.
 */
export function formatShortDate(iso: string, withYear = false): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: withYear ? '2-digit' : undefined,
    timeZone: 'UTC',
  })
}

/**
 * Rounds an axis up to a "nice" ceiling and step.
 *
 * A scale derived straight from the maximum produces ticks like ₹559 / ₹419 /
 * ₹279 — technically correct and unreadable, because nobody estimates a value
 * against a 139.75 interval. Snapping the step to a 1/1.5/2/2.5/3/4/5/7.5
 * multiple of a power of ten gives 0 / 150 / 300 / 450 / 600 instead.
 */
export function niceScale(max: number, tickCount = 4): { ceiling: number; step: number } {
  if (!Number.isFinite(max) || max <= 0) return { ceiling: 1, step: 0.25 }

  const rough = max / tickCount
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude

  const nice = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10].find((n) => normalized <= n) ?? 10
  const step = nice * magnitude

  return { ceiling: step * tickCount, step }
}
