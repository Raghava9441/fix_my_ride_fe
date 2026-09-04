import type { ApiFailure } from './types'

/**
 * The error taxonomy the rest of the app branches on.
 *
 * Components must never inspect a status code to decide what to render, and
 * must never know which HTTP library is underneath. They ask the error what
 * kind it is. Status codes stay available for logging and for the handful of
 * places that genuinely need the number.
 */
export type ApiErrorKind =
  /** No response at all: offline, DNS failure, CORS rejection, connection reset. */
  | 'network'
  /** We gave up waiting. Distinct from `network` because it is often retryable. */
  | 'timeout'
  /** The caller aborted — navigation, a superseded search, an unmounted component. */
  | 'canceled'
  /** 400 / 422 — the request was understood and rejected. `fieldErrors` is populated. */
  | 'validation'
  /** 401 — no valid session. */
  | 'unauthenticated'
  /** 403 — authenticated, not permitted. */
  | 'forbidden'
  | 'not_found'
  /** 409 — the resource changed underneath us. */
  | 'conflict'
  /** 429 — slow down. `retryAfterMs` is populated when the server said so. */
  | 'rate_limited'
  /** 5xx. */
  | 'server'
  /** Any other 4xx. */
  | 'client'
  /** A 2xx whose body wasn't the envelope we expect. */
  | 'parse'
  | 'unknown'

export interface ApiErrorContext {
  kind: ApiErrorKind
  status: number
  message: string
  code?: string
  /** Server-issued or client-generated; the id to quote in a bug report. */
  requestId?: string
  traceId?: string
  correlationId?: string
  fieldErrors?: Array<{ field?: string; message: string }>
  /** Structured payload from the failure envelope. See `ApiError.details`. */
  details?: Record<string, unknown>
  retryable: boolean
  retryAfterMs?: number
  /** How many attempts had already been made when this error surfaced. */
  attempt?: number
  method?: string
  /** Stable operation label, never the interpolated URL. */
  operation?: string
  cause?: unknown
}

/**
 * The single error type the API layer throws.
 *
 * Every failure path — transport, HTTP status, malformed envelope,
 * cancellation — is normalized into one of these, so a component's error
 * handling is a switch on `kind` rather than a pile of `axios.isAxiosError`
 * and `err.response?.status` checks.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number
  readonly code?: string
  readonly requestId?: string
  readonly traceId?: string
  readonly correlationId?: string
  readonly fieldErrors: Array<{ field?: string; message: string }>
  /**
   * Structured payload the server attached to this specific error code.
   *
   * Deliberately typed as `unknown` values: it is server-shaped data that
   * varies per code, so reading it should go through a narrowing helper
   * (`detailString` below) rather than a cast at the call site.
   */
  readonly details: Record<string, unknown>
  readonly retryable: boolean
  readonly retryAfterMs?: number
  readonly attempt: number
  readonly method?: string
  readonly operation?: string

  constructor(ctx: ApiErrorContext) {
    super(ctx.message, { cause: ctx.cause })
    this.name = 'ApiError'
    this.kind = ctx.kind
    this.status = ctx.status
    this.code = ctx.code
    this.requestId = ctx.requestId
    this.traceId = ctx.traceId
    this.correlationId = ctx.correlationId
    this.fieldErrors = ctx.fieldErrors ?? []
    this.details = ctx.details ?? {}
    this.retryable = ctx.retryable
    this.retryAfterMs = ctx.retryAfterMs
    this.attempt = ctx.attempt ?? 1
    this.method = ctx.method
    this.operation = ctx.operation

    // Cancellation is not a failure. Libraries and our own code sniff
    // `err.name === 'AbortError'` to tell "the user moved on" from "the
    // request broke"; keeping that name means TanStack Query, and anything
    // else that checks it, still treat an aborted request as cancelled
    // rather than showing an error state to someone who has already
    // navigated away.
    if (ctx.kind === 'canceled') this.name = 'AbortError'
  }

  /** True when the user aborted or navigated away — not something to report. */
  get isCanceled(): boolean {
    return this.kind === 'canceled'
  }

  get isAuthError(): boolean {
    return this.kind === 'unauthenticated'
  }

  /**
   * Matches the server's stable error code or key — `is('AUTH_010')` or
   * `is('auth.mfa_required')`, whichever the caller has to hand.
   *
   * Codes are the only part of a failure that is safe to branch on. Status
   * alone is too coarse (the MFA challenge and a wrong password are both
   * 401, and treating them the same tells a user with 2FA that their
   * password is wrong), and `message` is prose that will be reworded.
   */
  is(code: string): boolean {
    return this.code === code
  }

  /**
   * Reads a string out of `details`, or undefined if it isn't one.
   *
   * Narrows rather than casts because `details` is server-shaped: a missing
   * or renamed field should read as absent at the call site, not explode
   * halfway through a flow.
   */
  detailString(key: string): string | undefined {
    const value = this.details[key]
    return typeof value === 'string' && value.length > 0 ? value : undefined
  }

  /** Worth sending to error tracking? Cancellations and expected 4xx aren't. */
  get isReportable(): boolean {
    return !['canceled', 'unauthenticated', 'forbidden', 'not_found', 'validation'].includes(this.kind)
  }

  /** A sentence safe to render to a user — never the raw server message for 5xx. */
  get userMessage(): string {
    switch (this.kind) {
      case 'network':
        return 'Can’t reach the server. Check your connection and try again.'
      case 'timeout':
        return 'That took too long. Try again in a moment.'
      case 'unauthenticated':
        return 'Your session has expired. Sign in again to continue.'
      case 'forbidden':
        return 'You don’t have permission to do that.'
      case 'not_found':
        return 'We couldn’t find what you were looking for.'
      case 'conflict':
        return 'Someone else changed this while you were working. Reload and try again.'
      case 'rate_limited':
        return 'Too many requests. Wait a moment and try again.'
      case 'server':
      case 'parse':
      case 'unknown':
        // Deliberately generic: a 500's message can carry stack fragments or
        // internal identifiers, which belong in logs and not on screen.
        return 'Something went wrong on our end. Try again shortly.'
      case 'validation':
        return this.message
      case 'canceled':
        return ''
      default:
        // Unreachable while `kind` stays exhaustive above; keeps the getter
        // total if a new kind is added without updating this switch.
        return 'Something went wrong. Try again shortly.'
    }
  }

  /**
   * Flat, redaction-safe shape for logs and telemetry.
   *
   * `details` is deliberately excluded. It carries whatever the server
   * attached to the code, and for at least one code (`AUTH_010`) that is a
   * live credential — the MFA challenge token. An error object that reaches
   * the console, a log drain, and an error tracker must not be the thing
   * that leaks it, so it is opt-in at the call site rather than serialised
   * by default.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      kind: this.kind,
      status: this.status,
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      traceId: this.traceId,
      operation: this.operation,
      method: this.method,
      attempt: this.attempt,
      retryable: this.retryable,
    }
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Cancellation, whether it came from us or from a raw `AbortController`. */
export function isCanceledError(error: unknown): boolean {
  if (isApiError(error)) return error.isCanceled
  return error instanceof DOMException && error.name === 'AbortError'
}

/* ------------------------------------------------------------------ */
/* Classification                                                      */
/* ------------------------------------------------------------------ */

export function kindForStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation'
  if (status === 401) return 'unauthenticated'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  return 'unknown'
}

/**
 * Whether a *kind* is worth retrying, ignoring method safety.
 *
 * Idempotency is the other half of the decision and lives in retry.ts —
 * this answers "did the failure look transient", that answers "is repeating
 * this request safe".
 */
export function isRetryableKind(kind: ApiErrorKind): boolean {
  return kind === 'network' || kind === 'timeout' || kind === 'server' || kind === 'rate_limited'
}

/** `Retry-After` in seconds or as an HTTP date; returns milliseconds. */
export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined

  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)

  const date = Date.parse(header)
  if (Number.isFinite(date)) return Math.max(0, date - Date.now())

  return undefined
}

/** Builds an ApiError from the backend's failure envelope. */
export function fromFailureEnvelope(
  failure: ApiFailure,
  ctx: { status: number; requestId?: string; method?: string; operation?: string; attempt?: number; retryAfterMs?: number },
): ApiError {
  // The HTTP status wins over the envelope's own `statusCode`: the latter is
  // optional and absent on hand-rolled failure bodies (see ApiFailure).
  const status = ctx.status || failure.statusCode || 0
  const kind = kindForStatus(status)

  return new ApiError({
    kind,
    status,
    message: failure.message || 'Request failed',
    code: failure.code ?? failure.key,
    requestId: ctx.requestId,
    correlationId: failure.correlationId,
    fieldErrors: failure.errors,
    details: failure.details,
    retryable: isRetryableKind(kind),
    retryAfterMs: ctx.retryAfterMs,
    attempt: ctx.attempt,
    method: ctx.method,
    operation: ctx.operation,
  })
}
