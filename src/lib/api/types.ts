// Mirrors the response envelope in the backend's utils/apiResponse.ts —
// see docs/api-standards.md in the API repo. Every request either
// resolves with ApiSuccess.data or rejects with an ApiError built from
// ApiFailure.

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
  statusCode: number
  message: string
  code?: string
  key?: string
  correlationId?: string
  errors?: Array<{ field?: string; message: string }>
  timestamp: string
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure
