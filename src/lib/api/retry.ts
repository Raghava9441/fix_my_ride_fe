import { API_CONFIG } from './config'
import type { ApiError } from './errors'
import type { HttpMethod } from './types'

/**
 * Retry policy.
 *
 * Two independent questions, both of which must be yes:
 *
 *   1. **Did the failure look transient?** Network, timeout, 5xx, 429.
 *      Answered by the error's `retryable` flag (see errors.ts).
 *   2. **Is repeating this request safe?** Answered here, by method.
 *
 * GET, HEAD, PUT, and DELETE are idempotent by HTTP semantics, so repeating
 * one is defined to have the same effect as sending it once. POST and PATCH
 * are not: a retried `POST /service-records` after a timeout can create a
 * second job, and a timeout is exactly the case where the client cannot tell
 * whether the server already processed it. So non-idempotent methods are
 * never retried automatically — a caller that knows its endpoint is
 * idempotency-keyed can opt in per request with `retry: true`.
 */

const IDEMPOTENT_METHODS: ReadonlySet<HttpMethod> = new Set<HttpMethod>(['GET', 'HEAD', 'PUT', 'DELETE'])

export function isIdempotent(method: HttpMethod): boolean {
  return IDEMPOTENT_METHODS.has(method)
}

/**
 * App-wide ceiling on retries in flight.
 *
 * Without this, a broad 503 turns N concurrent queries into N × (1 + retries)
 * requests at an API that is already failing — the client becomes part of the
 * outage. The bucket refills steadily so normal intermittent failures still
 * get their retries; only a correlated storm exhausts it.
 */
class RetryBudget {
  // Annotated: `API_CONFIG` is `as const`, so the initializer alone would
  // narrow this to the literal budget value rather than `number`.
  private tokens: number = API_CONFIG.retryBudget
  private lastRefill = Date.now()

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    // One token per second, capped at the configured ceiling.
    const earned = Math.floor(elapsed / 1000)
    if (earned > 0) {
      this.tokens = Math.min(API_CONFIG.retryBudget, this.tokens + earned)
      this.lastRefill = now
    }
  }

  tryConsume(): boolean {
    this.refill()
    if (this.tokens <= 0) return false
    this.tokens--
    return true
  }

  get available(): number {
    this.refill()
    return this.tokens
  }

  reset(): void {
    this.tokens = API_CONFIG.retryBudget
    this.lastRefill = Date.now()
  }
}

export const retryBudget = new RetryBudget()

export interface RetryDecision {
  retry: boolean
  delayMs: number
  reason: string
}

/**
 * Exponential backoff with full jitter.
 *
 * Full jitter (`random(0, cap)`) rather than the more common
 * `cap/2 + random(cap/2)`: when an API recovers from an outage, every client
 * that was waiting retries at once and knocks it back over. Spreading
 * uniformly across the whole window is what actually decorrelates them.
 */
export function backoffDelay(attempt: number): number {
  const exponential = Math.min(
    API_CONFIG.retry.maxDelayMs,
    API_CONFIG.retry.baseDelayMs * 2 ** (attempt - 1),
  )
  return API_CONFIG.retry.jitter ? Math.round(Math.random() * exponential) : exponential
}

export function decideRetry(params: {
  error: ApiError
  attempt: number
  method: HttpMethod
  maxRetries: number
  /** Explicit opt-in/out from the call site. */
  retryEnabled?: boolean
}): RetryDecision {
  const { error, attempt, method, maxRetries, retryEnabled } = params
  const no = (reason: string): RetryDecision => ({ retry: false, delayMs: 0, reason })

  // Never retry something the caller abandoned — they've navigated away or
  // typed another character; a retry would be work nobody is waiting for.
  if (error.kind === 'canceled') return no('cancelled')

  // Retrying a 401 is pointless and harmful: the credentials are the
  // problem, and repeating the request can trip account lockout or
  // rate-limiting. The refresh flow in authRefresh.ts handles 401 once, and
  // that is a re-authentication, not a retry.
  if (error.kind === 'unauthenticated') return no('auth-failure')

  if (!error.retryable) return no(`non-retryable:${error.kind}`)
  if (attempt > maxRetries) return no('attempts-exhausted')

  const allowedByMethod = retryEnabled ?? isIdempotent(method)
  if (!allowedByMethod) return no(`non-idempotent:${method}`)

  if (!retryBudget.tryConsume()) return no('budget-exhausted')

  // A 429 with `Retry-After` is the server telling us exactly when to come
  // back. Ignoring it in favour of our own backoff is how a client earns a
  // longer ban.
  const delayMs = error.retryAfterMs ?? backoffDelay(attempt)

  return { retry: true, delayMs, reason: `retryable:${error.kind}` }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    // A backoff wait must be interruptible. Otherwise cancelling a request
    // still leaves a timer holding its closure alive for up to 4 seconds,
    // and the retry fires after the component is gone.
    function onAbort() {
      clearTimeout(timer)
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
