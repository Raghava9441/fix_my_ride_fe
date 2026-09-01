import { API_CONFIG } from '../api/config'
import { telemetry } from './telemetry'

/**
 * Client-side API metrics.
 *
 * Aggregates in memory and reports a rollup periodically, rather than
 * emitting an event per request. A busy screen issues hundreds of requests a
 * minute; forwarding each one individually is a second traffic problem on
 * top of the first, and most providers bill per event.
 *
 * Percentiles are computed from a bounded reservoir per operation. Exact
 * percentiles need every sample retained, which is unbounded memory in a
 * long-lived tab; 512 samples give a P95 accurate enough to answer "is this
 * endpoint slow" while capping the cost.
 */

const RESERVOIR_SIZE = 512

export interface OperationStats {
  operation: string
  count: number
  success: number
  errors: number
  timeouts: number
  cancellations: number
  retries: number
  cacheHits: number
  dedupeHits: number
  p50: number
  p75: number
  p95: number
  p99: number
  max: number
}

interface Bucket {
  count: number
  success: number
  errors: number
  timeouts: number
  cancellations: number
  retries: number
  cacheHits: number
  dedupeHits: number
  durations: number[]
}

function emptyBucket(): Bucket {
  return {
    count: 0,
    success: 0,
    errors: 0,
    timeouts: 0,
    cancellations: 0,
    retries: 0,
    cacheHits: 0,
    dedupeHits: 0,
    durations: [],
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return Math.round(sorted[index])
}

class ApiMetrics {
  private buckets = new Map<string, Bucket>()
  private flushTimer: ReturnType<typeof setInterval> | null = null

  private bucket(operation: string): Bucket {
    let bucket = this.buckets.get(operation)
    if (!bucket) {
      bucket = emptyBucket()
      this.buckets.set(operation, bucket)
    }
    return bucket
  }

  record(event: {
    operation: string
    durationMs: number
    outcome: 'success' | 'error' | 'timeout' | 'cancelled'
    retries?: number
    fromCache?: boolean
    deduped?: boolean
    status?: number
    errorKind?: string
  }): void {
    const bucket = this.bucket(event.operation)
    bucket.count++

    if (event.retries) bucket.retries += event.retries
    if (event.fromCache) bucket.cacheHits++
    if (event.deduped) bucket.dedupeHits++

    switch (event.outcome) {
      case 'success':
        bucket.success++
        break
      case 'timeout':
        bucket.timeouts++
        bucket.errors++
        break
      case 'cancelled':
        bucket.cancellations++
        break
      case 'error':
        bucket.errors++
        break
    }

    // A cancelled request's duration says how long the user waited before
    // moving on, not how long the endpoint takes — including it would drag
    // every latency percentile toward noise.
    if (event.outcome !== 'cancelled') {
      if (bucket.durations.length < RESERVOIR_SIZE) {
        bucket.durations.push(event.durationMs)
      } else {
        // Reservoir sampling keeps the retained set representative of the
        // whole window rather than just its first 512 requests.
        const index = Math.floor(Math.random() * bucket.count)
        if (index < RESERVOIR_SIZE) bucket.durations[index] = event.durationMs
      }
    }

    // Per-request signal to the provider, with bounded-cardinality labels
    // only: `operation` is a fixed identifier from the endpoint registry,
    // never an interpolated URL.
    telemetry.metric({
      name: 'api.request.duration',
      value: event.durationMs,
      type: 'histogram',
      labels: {
        operation: event.operation,
        outcome: event.outcome,
        // Bucketed rather than exact, so 4xx/5xx don't fan out into
        // dozens of series.
        status: event.status ? `${Math.floor(event.status / 100)}xx` : 'none',
      },
    })
  }

  /** Current rollup, for the dev inspector and for a periodic flush. */
  snapshot(): OperationStats[] {
    return [...this.buckets.entries()]
      .map(([operation, bucket]) => {
        const sorted = [...bucket.durations].sort((a, b) => a - b)
        return {
          operation,
          count: bucket.count,
          success: bucket.success,
          errors: bucket.errors,
          timeouts: bucket.timeouts,
          cancellations: bucket.cancellations,
          retries: bucket.retries,
          cacheHits: bucket.cacheHits,
          dedupeHits: bucket.dedupeHits,
          p50: percentile(sorted, 50),
          p75: percentile(sorted, 75),
          p95: percentile(sorted, 95),
          p99: percentile(sorted, 99),
          max: sorted.length ? Math.round(sorted[sorted.length - 1]) : 0,
        }
      })
      .sort((a, b) => b.count - a.count)
  }

  reset(): void {
    this.buckets.clear()
  }

  /** Starts the periodic rollup. Safe to call twice. */
  start(): void {
    if (this.flushTimer) return
    this.flushTimer = setInterval(() => {
      for (const stats of this.snapshot()) {
        telemetry.metric({
          name: 'api.operation.rollup',
          value: stats.count,
          type: 'counter',
          labels: { operation: stats.operation },
        })
      }
      // Windowed, not cumulative: percentiles over the whole session stop
      // reflecting current conditions after the first few minutes.
      this.reset()
    }, API_CONFIG.metricsFlushMs)
  }

  stop(): void {
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flushTimer = null
  }
}

export const apiMetrics = new ApiMetrics()
