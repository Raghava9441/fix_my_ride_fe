import { API_BASE_URL, API_CONFIG, REQUEST_ID_HEADER, TRACEPARENT_HEADER } from './config'
import {
  ApiError,
  fromFailureEnvelope,
  kindForStatus,
  isRetryableKind,
  parseRetryAfter,
} from './errors'
import type { ApiEnvelope, ApiResponse, HttpMethod, QueryParams } from './types'

/**
 * One HTTP attempt. No retries, no deduplication, no auth refresh — those
 * compose on top in client.ts. This layer's only job is to turn a request
 * description into either an `ApiResponse` or an `ApiError`, with nothing in
 * between escaping as a raw `TypeError` or `DOMException`.
 *
 * Built on `fetch` rather than axios. Axios was removed because every feature
 * we were using it for — interceptors, cancellation, JSON handling — is
 * reimplemented here anyway (retry, dedupe, telemetry, and envelope parsing
 * all need control axios's interceptor model makes awkward), and it cost a
 * measured 19.0KB gzipped in the entry bundle — against ~3.6KB gzipped for
 * this layer that replaces it. `AbortSignal` composition and the
 * distinction between an aborted request and a failed one are also
 * first-class in fetch and were not in the axios wrapper.
 */

export interface TransportRequest {
  method: HttpMethod
  url: string
  params?: QueryParams
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  timeoutMs?: number
  requestId: string
  traceContext?: { traceId: string; spanId: string }
  operation: string
  attempt: number
}

export function buildUrl(path: string, params?: QueryParams): string {
  const base = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return base

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    // Empty values are dropped rather than serialized as `?q=`, which some
    // backends treat as "filter by empty string" and others as absent.
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * Composes the caller's signal with a timeout.
 *
 * `AbortSignal.any` does this natively but isn't in every browser we support
 * yet, and the manual version also lets us record *which* signal fired —
 * "the user navigated away" and "the server never answered" are different
 * events and must not collapse into one error kind.
 */
function withTimeout(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('Request timed out', 'TimeoutError'))
  }, timeoutMs)

  const onExternalAbort = () => controller.abort(external?.reason)

  if (external) {
    if (external.aborted) controller.abort(external.reason)
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    // Always called in a `finally`. Leaving the timer or the listener behind
    // keeps the closure — and the response it captured — alive; that is the
    // shape most "the SPA leaks memory" bugs actually take.
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('json')) return null

  try {
    return (await response.json()) as ApiEnvelope<T>
  } catch {
    // A 204, or a proxy that sent an HTML error page with a JSON
    // content-type. Either way there's no envelope to work with.
    return null
  }
}

export async function performRequest<T>(request: TransportRequest): Promise<ApiResponse<T>> {
  const timeoutMs = request.timeoutMs ?? API_CONFIG.timeoutMs
  const { signal, didTimeOut, cleanup } = withTimeout(timeoutMs, request.signal)

  const headers: Record<string, string> = {
    Accept: 'application/json',
    [REQUEST_ID_HEADER]: request.requestId,
    ...request.headers,
  }

  if (request.traceContext) {
    // W3C trace context, so a frontend request can be joined to its backend
    // spans. Only sent when a telemetry provider actually supplies one —
    // inventing a trace id the backend can't correlate is noise.
    headers[TRACEPARENT_HEADER] = `00-${request.traceContext.traceId}-${request.traceContext.spanId}-01`
  }

  const hasBody = request.body !== undefined && request.method !== 'GET' && request.method !== 'HEAD'

  /*
   * File uploads pass `FormData` straight through. Setting `Content-Type`
   * ourselves would omit the multipart boundary the browser generates, and
   * the server would fail to parse the body — so the header is deliberately
   * left unset for this case.
   */
  const isFormData = typeof FormData !== 'undefined' && request.body instanceof FormData
  if (hasBody && !isFormData) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(request.url, request.params), {
      method: request.method,
      headers,
      body: hasBody ? (isFormData ? (request.body as FormData) : JSON.stringify(request.body)) : undefined,
      signal,
      credentials: 'same-origin',
    })
  } catch (cause) {
    const aborted = cause instanceof DOMException && cause.name === 'AbortError'
    const isTimeout = didTimeOut() || (cause instanceof DOMException && cause.name === 'TimeoutError')

    throw new ApiError({
      // The order matters: a timeout aborts the signal, so checking
      // `aborted` first would misreport every timeout as a cancellation and
      // silently swallow it instead of retrying.
      kind: isTimeout ? 'timeout' : aborted ? 'canceled' : 'network',
      status: 0,
      message: isTimeout
        ? `Request timed out after ${timeoutMs}ms`
        : aborted
          ? 'Request cancelled'
          : 'Network request failed',
      retryable: isTimeout,
      requestId: request.requestId,
      method: request.method,
      operation: request.operation,
      attempt: request.attempt,
      cause,
    })
  } finally {
    cleanup()
  }

  // Prefer the server's id: it's the one that appears in backend logs.
  const requestId = response.headers.get(REQUEST_ID_HEADER) ?? request.requestId
  const envelope = await readEnvelope<T>(response)

  if (!response.ok) {
    const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'))

    if (envelope && envelope.success === false) {
      throw fromFailureEnvelope(envelope, {
        status: response.status,
        requestId,
        method: request.method,
        operation: request.operation,
        attempt: request.attempt,
        retryAfterMs,
      })
    }

    // Non-enveloped failure: a gateway timeout page, a proxy 502, a CORS
    // preflight rejection. Classify from the status alone.
    const kind = kindForStatus(response.status)
    throw new ApiError({
      kind,
      status: response.status,
      message: `${response.status} ${response.statusText || 'Request failed'}`,
      retryable: isRetryableKind(kind),
      retryAfterMs,
      requestId,
      method: request.method,
      operation: request.operation,
      attempt: request.attempt,
    })
  }

  if (response.status === 204 || envelope === null) {
    // A successful response with no body — DELETE, or an endpoint that
    // returns nothing. `undefined as T` is honest: there is no payload.
    return { data: undefined as T, meta: null, requestId, status: response.status }
  }

  if (envelope.success === false) {
    // 2xx carrying `success: false`. Rare, but the backend's envelope allows
    // it, and treating it as success would hand components a failure object
    // typed as their data.
    throw fromFailureEnvelope(envelope, {
      status: response.status,
      requestId,
      method: request.method,
      operation: request.operation,
      attempt: request.attempt,
    })
  }

  return {
    data: envelope.data,
    meta: envelope.meta,
    requestId: envelope.meta?.requestId ?? requestId,
    status: response.status,
  }
}
