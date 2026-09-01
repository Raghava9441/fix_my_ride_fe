import { getAccessToken } from '../auth/tokenStore'
import { scopedLogger } from '../observability/logger'
import { apiMetrics } from '../observability/metrics'
import { redactUrl } from '../observability/redact'
import { telemetry } from '../observability/telemetry'
import { API_CONFIG } from './config'
import { refreshAccessToken } from './authRefresh'
import { buildDedupeKey, requestDeduplicator } from './dedupe'
import { ApiError, isApiError, isCanceledError } from './errors'
import { recordTrace } from './devtools'
import { newRequestId } from './requestId'
import { decideRetry, isIdempotent, sleep } from './retry'
import { performRequest } from './transport'
import type { ApiResponse, HttpMethod, QueryParams, RequestOptions } from './types'

const log = scopedLogger('api')

/**
 * The shared API client.
 *
 * Composes the transport with the cross-cutting concerns, in this order:
 *
 *     dedupe ─▶ [ attempt loop: auth ─▶ transport ─▶ classify ─▶ retry ] ─▶ observe
 *
 * Deduplication is outermost so joined callers share the retry and auth work
 * too, not just the socket. The attempt loop is innermost because a retry has
 * to re-read the access token — a 401 that triggered a refresh means the
 * token captured before the first attempt is stale by the time we retry.
 *
 * What deliberately isn't here: anything that knows about vehicles, invoices,
 * or sessions. Feature knowledge lives in feature service modules, so this
 * file stays something you can reason about in one sitting at 500 endpoints
 * as easily as at 10.
 */

function resolveOperation(method: HttpMethod, url: string, explicit?: string): string {
  if (explicit) return explicit

  // Fallback label with ids collapsed to `:id`. Without this, `/vehicles/abc`
  // and `/vehicles/def` become separate metric series — the high-cardinality
  // problem that gets a metric dropped by the backend. Endpoints should still
  // pass an explicit `operation`; this only keeps an un-labelled call from
  // poisoning the metric namespace.
  const normalized = url
    .split('?')[0]
    .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-fA-F-]{36}(?=\/|$)/g, '/:id')

  return `${method} ${normalized}`
}

async function attemptWithAuth<T>(params: {
  options: RequestOptions
  method: HttpMethod
  operation: string
  requestId: string
  attempt: number
  signal: AbortSignal
  /** Set once a 401 has already been resolved by a refresh on this request. */
  refreshed: boolean
}): Promise<{ response: ApiResponse<T>; refreshed: boolean }> {
  const { options, method, operation, requestId, attempt, signal } = params
  let refreshed = params.refreshed

  const headers = { ...options.headers }
  if (!options.anonymous) {
    const token = getAccessToken()
    // Read at attempt time, not once up front: a concurrent refresh may have
    // replaced it since this request was queued.
    if (token) headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await performRequest<T>({
      method,
      url: options.url,
      params: options.params,
      body: options.body,
      headers,
      signal,
      timeoutMs: options.timeoutMs,
      requestId,
      traceContext: telemetry.traceContext(),
      operation,
      attempt,
    })
    return { response, refreshed }
  } catch (error) {
    if (!isApiError(error)) throw error

    // A 401 gets exactly one re-authentication, and only for requests that
    // carry credentials. Looping here — or treating it as a retryable
    // failure — is how a client turns one expired token into an
    // authentication storm.
    const canRefresh =
      error.kind === 'unauthenticated' && !options.anonymous && !refreshed && !signal.aborted

    if (canRefresh) {
      const outcome = await refreshAccessToken()
      if (outcome.ok) {
        log.debug('retrying after token refresh', { operation, requestId })
        return attemptWithAuth<T>({ ...params, refreshed: true })
      }
    }

    throw error
  }
}

async function execute<T>(options: RequestOptions, signal: AbortSignal): Promise<ApiResponse<T>> {
  const method = options.method ?? 'GET'
  const operation = resolveOperation(method, options.url, options.operation)
  const maxRetries = options.maxRetries ?? API_CONFIG.retry.maxRetries

  let attempt = 1
  let refreshed = false

  for (;;) {
    try {
      // Annotated explicitly: `attemptWithAuth` recurses after a refresh, and
      // without this TS can't close the loop on its own inferred type.
      const result: { response: ApiResponse<T>; refreshed: boolean } = await attemptWithAuth<T>({
        options,
        method,
        operation,
        requestId: newRequestId(),
        attempt,
        signal,
        refreshed,
      })
      refreshed = result.refreshed
      return result.response
    } catch (error) {
      if (!isApiError(error)) throw error

      const decision = decideRetry({
        error,
        attempt,
        method,
        maxRetries,
        retryEnabled: options.retry,
      })

      if (!decision.retry) throw error

      log.debug('retrying request', {
        operation,
        attempt,
        delayMs: decision.delayMs,
        reason: decision.reason,
      })

      // Interruptible — a cancelled request must not leave a timer holding
      // its closure alive through the backoff.
      await sleep(decision.delayMs, signal)
      attempt++
    }
  }
}

/**
 * Runs a request with observability, deduplication, retry, and auth applied.
 * Everything else in the app goes through this.
 */
export async function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const method = options.method ?? 'GET'
  const operation = resolveOperation(method, options.url, options.operation)
  const startedAt = performance.now()

  const dedupeEnabled = options.dedupe ?? (method === 'GET' || method === 'HEAD')
  const dedupeKey = buildDedupeKey({ method, url: options.url, params: options.params, body: options.body })

  let attempts = 1
  let deduped = false
  let requestId = ''
  let status = 0

  const run = (signal: AbortSignal) =>
    execute<T>(options, signal).then((response) => {
      requestId = response.requestId
      status = response.status
      return response
    })

  try {
    let response: ApiResponse<T>

    if (dedupeEnabled) {
      const shared = requestDeduplicator.run(dedupeKey, run, options.signal)
      deduped = shared.deduped
      response = await shared.promise
    } else {
      // Non-deduped calls still need the caller's signal honoured; when
      // there isn't one, an already-aborted dummy would cancel immediately,
      // so fall back to a never-aborting controller.
      response = await run(options.signal ?? new AbortController().signal)
    }

    const durationMs = performance.now() - startedAt

    apiMetrics.record({ operation, durationMs, outcome: 'success', retries: attempts - 1, deduped, status: response.status })
    telemetry.span({
      name: `api ${operation}`,
      duration: durationMs,
      status: 'ok',
      attributes: { operation, method, status: response.status, deduped },
    })
    recordTrace({
      requestId: response.requestId,
      operation,
      method,
      url: options.url,
      startedAt,
      durationMs,
      status: response.status,
      outcome: 'success',
      attempts,
      deduped,
    })

    log.debug('request succeeded', {
      operation,
      method,
      // Redacted: query strings routinely carry search terms and identifiers.
      url: redactUrl(options.url),
      status: response.status,
      durationMs: Math.round(durationMs),
      requestId: response.requestId,
      deduped,
    })

    return response
  } catch (error) {
    const durationMs = performance.now() - startedAt

    /*
     * The deduplicator rejects a detaching subscriber with the raw abort
     * reason rather than an `ApiError` — it never reached the transport, so
     * nothing normalized it. Classifying that here keeps cancellation a
     * cancellation: without it an aborted request surfaces as kind
     * `unknown`, gets reported to error tracking, and shows the user an
     * error for a request they themselves abandoned.
     */
    const apiError = isApiError(error)
      ? error
      : new ApiError(
          isCanceledError(error) || options.signal?.aborted
            ? {
                kind: 'canceled',
                status: 0,
                message: 'Request cancelled',
                retryable: false,
                operation,
                method,
                cause: error,
              }
            : {
                kind: 'unknown',
                status: 0,
                message: error instanceof Error ? error.message : 'Unknown error',
                retryable: false,
                operation,
                method,
                cause: error,
              },
        )

    attempts = apiError.attempt
    const outcome =
      apiError.kind === 'canceled' ? 'cancelled' : apiError.kind === 'timeout' ? 'timeout' : 'error'

    apiMetrics.record({
      operation,
      durationMs,
      outcome,
      retries: attempts - 1,
      deduped,
      status: apiError.status,
      errorKind: apiError.kind,
    })

    telemetry.span({
      name: `api ${operation}`,
      duration: durationMs,
      status: outcome === 'cancelled' ? 'cancelled' : 'error',
      attributes: { operation, method, status: apiError.status, errorKind: apiError.kind },
    })

    recordTrace({
      requestId: apiError.requestId ?? requestId,
      operation,
      method,
      url: options.url,
      startedAt,
      durationMs,
      status: apiError.status || status,
      outcome,
      attempts,
      deduped,
      error: apiError,
    })

    // A cancellation is the user moving on, not a fault. Reporting them
    // buries real errors under navigation noise — on a search-as-you-type
    // field they'd be the majority of everything reported.
    if (apiError.isReportable) {
      log.error('request failed', {
        operation,
        method,
        url: redactUrl(options.url),
        ...apiError.toJSON(),
        durationMs: Math.round(durationMs),
      })
      telemetry.error({
        error: apiError,
        severity: 'error',
        context: { operation, method, url: redactUrl(options.url), durationMs: Math.round(durationMs) },
        // Group by operation and kind rather than by message, so one
        // endpoint's failures don't shatter into an issue per request id.
        fingerprint: ['api', operation, apiError.kind],
      })
    } else if (apiError.kind !== 'canceled') {
      log.debug('request rejected', { operation, ...apiError.toJSON() })
    }

    /*
     * If the *caller* aborted, hand back their own abort reason rather than
     * our normalized error.
     *
     * The normalization guarantee covers failures; a cancellation the caller
     * asked for is not one. Server-state libraries identify their own
     * cancellations by the reason they aborted with — TanStack Query throws
     * its `CancelledError` and reverts the query to its previous state when
     * it sees that reason come back. Substituting an `ApiError` here made
     * every cancellation look like a genuine rejection, which put the query
     * into an error state: on any StrictMode double-mount the list screens
     * rendered an error for a request the user never abandoned.
     *
     * Observability above has already recorded the cancellation, so nothing
     * is lost by rethrowing the original.
     */
    if (apiError.kind === 'canceled' && options.signal?.aborted) {
      throw options.signal.reason ?? apiError
    }

    throw apiError
  }
}

/** `request()` without the envelope metadata, for the common case. */
export async function requestData<T>(options: RequestOptions): Promise<T> {
  const response = await request<T>(options)
  return response.data
}

/** Method-shaped helpers. Thin on purpose — all behaviour lives in `request`. */
export const api = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>) =>
    requestData<T>({ ...options, url, method: 'GET' }),

  /** Full response, for paginated endpoints that need `meta.pagination`. */
  getPage: <T>(url: string, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>) =>
    request<T>({ ...options, url, method: 'GET' }),

  post: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>) =>
    requestData<T>({ ...options, url, method: 'POST', body }),

  put: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>) =>
    requestData<T>({ ...options, url, method: 'PUT', body }),

  patch: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>) =>
    requestData<T>({ ...options, url, method: 'PATCH', body }),

  delete: <T>(url: string, options?: Omit<RequestOptions, 'url' | 'method' | 'body'>) =>
    requestData<T>({ ...options, url, method: 'DELETE' }),
} as const

/** Cancels everything in flight. Called on sign-out. */
export function abortAllRequests(reason = 'session ended'): void {
  requestDeduplicator.abortAll(reason)
}

export { isIdempotent }
export type { RequestOptions, ApiResponse, QueryParams }
