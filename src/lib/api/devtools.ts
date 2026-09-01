import { API_CONFIG } from './config'
import { apiMetrics } from '../observability/metrics'
import { redactUrl } from '../observability/redact'
import type { ApiError } from './errors'

/**
 * Development-only request inspector.
 *
 * Answers, from the console, the questions that are otherwise archaeology
 * across the Network tab and React DevTools:
 *
 *   __fmrApi.recent()      what was called, when, how long, from cache?
 *   __fmrApi.failures()    what failed and why, with request ids
 *   __fmrApi.slow(500)     which operations are over a threshold
 *   __fmrApi.stats()       per-operation counts and P50/P95/P99
 *   __fmrApi.byOperation('vehicles.list')
 *
 * The Network tab shows *what* went out. It doesn't show which feature
 * triggered it, whether it was served from cache, deduplicated onto another
 * request, retried, or cancelled — which is most of what you actually want
 * when a screen fires nine requests it shouldn't.
 *
 * Entirely stripped from production builds: every entry point is behind
 * `import.meta.env.DEV`, which Vite evaluates statically, so the ring buffer
 * and its retained URLs don't exist in a release bundle.
 */

export interface RequestTrace {
  id: string
  requestId: string
  operation: string
  method: string
  /** Query string redacted; never the raw URL. */
  url: string
  startedAt: number
  durationMs: number
  status: number
  outcome: 'success' | 'error' | 'timeout' | 'cancelled'
  attempts: number
  deduped: boolean
  errorKind?: string
  errorMessage?: string
}

const enabled = import.meta.env.DEV

class ApiInspector {
  private entries: RequestTrace[] = []

  record(trace: RequestTrace): void {
    if (!enabled) return

    this.entries.push(trace)
    // Bounded ring buffer. An unbounded array here would be exactly the
    // memory leak this layer is supposed to prevent.
    if (this.entries.length > API_CONFIG.devtools.maxEntries) {
      this.entries.splice(0, this.entries.length - API_CONFIG.devtools.maxEntries)
    }
  }

  recent(limit = 25): RequestTrace[] {
    return this.entries.slice(-limit).reverse()
  }

  failures(limit = 25): RequestTrace[] {
    return this.entries.filter((e) => e.outcome === 'error' || e.outcome === 'timeout').slice(-limit).reverse()
  }

  slow(thresholdMs = 500): RequestTrace[] {
    return this.entries.filter((e) => e.durationMs >= thresholdMs).sort((a, b) => b.durationMs - a.durationMs)
  }

  byOperation(operation: string): RequestTrace[] {
    return this.entries.filter((e) => e.operation === operation).reverse()
  }

  /** Finds a request by the id shown in an error report. */
  byRequestId(requestId: string): RequestTrace | undefined {
    return this.entries.find((e) => e.requestId === requestId)
  }

  stats() {
    return apiMetrics.snapshot()
  }

  clear(): void {
    this.entries = []
  }
}

export const apiInspector = new ApiInspector()

export function recordTrace(input: {
  requestId: string
  operation: string
  method: string
  url: string
  params?: Record<string, unknown>
  startedAt: number
  durationMs: number
  status: number
  outcome: RequestTrace['outcome']
  attempts: number
  deduped: boolean
  error?: ApiError
}): void {
  if (!enabled) return

  apiInspector.record({
    id: `${input.method}:${input.operation}:${input.startedAt}`,
    requestId: input.requestId,
    operation: input.operation,
    method: input.method,
    url: redactUrl(input.url),
    startedAt: input.startedAt,
    durationMs: Math.round(input.durationMs),
    status: input.status,
    outcome: input.outcome,
    attempts: input.attempts,
    deduped: input.deduped,
    errorKind: input.error?.kind,
    errorMessage: input.error?.message,
  })
}

if (enabled && typeof window !== 'undefined') {
  ;(window as unknown as { __fmrApi: unknown }).__fmrApi = {
    recent: (limit?: number) => console.table(apiInspector.recent(limit)),
    failures: (limit?: number) => console.table(apiInspector.failures(limit)),
    slow: (ms?: number) => console.table(apiInspector.slow(ms)),
    byOperation: (operation: string) => console.table(apiInspector.byOperation(operation)),
    byRequestId: (requestId: string) => apiInspector.byRequestId(requestId),
    stats: () => console.table(apiInspector.stats()),
    raw: () => apiInspector.recent(API_CONFIG.devtools.maxEntries),
    clear: () => apiInspector.clear(),
  }
}
