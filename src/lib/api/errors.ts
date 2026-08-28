import type { ApiFailure } from './types'

/** Thrown by the API client for any non-2xx or `success: false` response. */
export class ApiError extends Error {
  readonly statusCode: number
  readonly code?: string
  readonly key?: string
  readonly correlationId?: string
  readonly fieldErrors: Array<{ field?: string; message: string }>

  constructor(failure: ApiFailure) {
    super(failure.message || 'Request failed')
    this.name = 'ApiError'
    this.statusCode = failure.statusCode
    this.code = failure.code
    this.key = failure.key
    this.correlationId = failure.correlationId
    this.fieldErrors = failure.errors ?? []
  }

  get isAuthError(): boolean {
    return this.statusCode === 401
  }
}
