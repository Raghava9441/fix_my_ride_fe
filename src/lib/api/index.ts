/**
 * Public surface of the API layer.
 *
 * Features import from `@/lib/api` and nothing deeper. That keeps the
 * internals — transport, retry, dedupe, the refresh flow — free to change
 * without a repo-wide edit, and makes an import from `@/lib/api/transport`
 * an obvious review flag.
 */

export { api, request, requestData, abortAllRequests } from './client'
export { fetchPage } from './list'
export { API_BASE_URL, API_CONFIG } from './config'
export { queryKeys } from './queryKeys'

export { isPopulated, refId } from './domain'
export type { Address, BaseDocument, GeoPoint, Id, IsoDate, ListParams, Ref } from './domain'
export { newRequestId } from './requestId'
export { setSessionExpiredHandler } from './authRefresh'
export { apiInspector } from './devtools'

export {
  ApiError,
  isApiError,
  isCanceledError,
  kindForStatus,
  isRetryableKind,
} from './errors'
export type { ApiErrorKind, ApiErrorContext } from './errors'

export type {
  ApiEnvelope,
  ApiFailure,
  ApiMeta,
  ApiResponse,
  ApiSuccess,
  HttpMethod,
  Page,
  Pagination,
  QueryParams,
  RequestOptions,
} from './types'
