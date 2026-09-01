/**
 * API layer configuration.
 *
 * Everything tunable about transport behaviour lives here rather than being
 * scattered as literals through the client, so "why did that request wait 30
 * seconds" has one place to look.
 */

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    // Fail loudly at module load rather than silently issuing requests
    // against a relative URL. The previous client did `import.meta.env
    // .VITE_API_URL as string`, so a missing variable produced requests to
    // the dev server's own origin that 404'd with an HTML body — an
    // expensive thing to debug for a one-line misconfiguration.
    throw new Error(
      `[api] ${name} is not set. Copy .env.example to .env.development and set it (e.g. http://localhost:5000/api/v1).`,
    )
  }
  return value.replace(/\/+$/, '')
}

export const API_BASE_URL = requireEnv('VITE_API_URL', import.meta.env.VITE_API_URL as string | undefined)

export const API_CONFIG = {
  /**
   * Wall-clock budget for a single attempt, not for the whole retry
   * sequence. A request that exceeds it is aborted and surfaces as a
   * `timeout` error rather than hanging forever — the previous client set no
   * timeout at all, so a stalled connection meant a permanently pending
   * query and a spinner that never resolved.
   */
  timeoutMs: 15_000,

  /** Longer budget for endpoints that legitimately take a while (exports, reports). */
  longTimeoutMs: 60_000,

  retry: {
    /** Attempts *after* the first. 2 retries = at most 3 requests. */
    maxRetries: 2,
    /** First backoff step; doubles each attempt. */
    baseDelayMs: 300,
    /** Ceiling per step, so a long backoff can't strand a user behind a spinner. */
    maxDelayMs: 4_000,
    /**
     * Full jitter (`random(0, delay)`) rather than a fixed delay. When an API
     * recovers from an outage every client that was waiting retries at the
     * same instant otherwise, and the recovery is immediately undone by the
     * thundering herd.
     */
    jitter: true,
  },

  /**
   * Ceiling on retries in flight across the whole app at once. Without it, a
   * broad 503 turns N concurrent queries into N × (1 + maxRetries) requests
   * aimed at an API that is already failing.
   */
  retryBudget: 12,

  /** How long a completed request stays in the DEV inspector ring buffer. */
  devtools: {
    maxEntries: 200,
  },

  /** Metrics roll up into windows this long before being reported. */
  metricsFlushMs: 60_000,
} as const

/** Header the backend reads for request correlation. */
export const REQUEST_ID_HEADER = 'X-Request-Id'

/** W3C trace context. Sent only when a trace provider supplies a trace id. */
export const TRACEPARENT_HEADER = 'traceparent'
