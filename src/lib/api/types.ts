// Mirrors the response envelope in the backend's utils/apiResponse.ts —
// see docs/api-standards.md in the API repo. Every request either resolves
// with ApiSuccess.data or rejects with an ApiError normalized from
// ApiFailure (or from a transport failure that never produced an envelope).

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ApiMeta {
  pagination?: Pagination
  requestId?: string
  [key: string]: unknown
}

export interface ApiSuccess<T> {
  success: true
  statusCode: number
  message: string
  data: T
  meta: ApiMeta | null
  timestamp: string
}

export interface ApiFailure {
  success: false
  /**
   * Absent on hand-rolled failure responses. `auth.routes.ts` builds the
   * MFA-required body inline rather than throwing through the global error
   * handler, and omits this field — so never rely on it when the HTTP status
   * is available.
   */
  statusCode?: number
  message: string
  code?: string
  key?: string
  correlationId?: string
  errors?: Array<{ field?: string; message: string }>
  /**
   * Structured payload attached to a specific error code, carried through to
   * `ApiError.details`.
   *
   * This is not decoration: some failures are a *step in a flow* rather than
   * a dead end, and the data needed to continue arrives here. The MFA
   * challenge is the case that forced it — `POST /auth/login` answers 401
   * `AUTH_010` with `{ mfaToken }` in this field, and without it the client
   * has no way to complete the sign-in it just started.
   */
  details?: Record<string, unknown>
  timestamp: string
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

/**
 * A response with its envelope metadata kept.
 *
 * The previous client returned `envelope.data` and dropped `meta` on the
 * floor, which made server-side pagination unreachable from the frontend
 * — the `Pagination` type existed and had no way to be populated. Callers
 * that need the metadata use `request()`; callers that don't use `data()`
 * and get the payload directly.
 */
export interface ApiResponse<T> {
  data: T
  meta: ApiMeta | null
  /** Echoed back by the server, or the id we generated for the request. */
  requestId: string
  status: number
}

/** A page of results plus the cursor information needed to ask for the next. */
export interface Page<T> {
  items: T[]
  pagination: Pagination
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'

/** Query string values. `undefined`/`null`/`''` entries are dropped, not serialized. */
export type QueryParams = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions {
  method?: HttpMethod
  /** Path relative to the API base URL, e.g. `/vehicles/123`. */
  url: string
  params?: QueryParams
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Overrides `API_CONFIG.timeoutMs` for this call. */
  timeoutMs?: number

  /**
   * Whether this call may be retried automatically. Defaults to true for
   * GET/HEAD and false for everything else — see retry.ts for why that
   * default is not negotiable for un-keyed mutations.
   */
  retry?: boolean
  /** Overrides the retry count for this call. */
  maxRetries?: number

  /**
   * Skip in-flight deduplication. Defaults to dedupe-on for GET/HEAD.
   * Turn it off for a poll that intentionally re-reads the same URL.
   */
  dedupe?: boolean

  /** Don't attach the Authorization header (login, refresh, public endpoints). */
  anonymous?: boolean

  /**
   * Stable label for metrics and logs, e.g. `vehicles.list`. Metrics are
   * keyed on this rather than on the URL, which keeps `/vehicles/abc123`
   * from creating one time series per vehicle id.
   */
  operation?: string
}
