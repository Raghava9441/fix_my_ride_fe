import { request } from './client'
import type { Page, QueryParams, RequestOptions } from './types'

/**
 * Reads a paginated list endpoint.
 *
 * Every list in this API returns rows in `data` and its pagination in
 * `meta.pagination`, so without a helper each of the twenty-odd service
 * modules would repeat the same unwrap-and-fall-back block. Worse, they would
 * repeat it *slightly differently*, and a screen would eventually paginate
 * against a subtly wrong `hasNext`.
 *
 * The fallback matters: several endpoints still return a bare array with no
 * pagination meta. Synthesising a single-page descriptor means callers get
 * one shape and never branch on which style of response they got.
 */
export async function fetchPage<T>(
  options: RequestOptions & { params?: QueryParams },
): Promise<Page<T>> {
  const response = await request<T[]>({ ...options, method: options.method ?? 'GET' })

  // A list endpoint that 204s, or returns `null` for an empty result, would
  // otherwise put `undefined` where callers expect an array to map over.
  const items = Array.isArray(response.data) ? response.data : []
  const params = options.params ?? {}

  return {
    items,
    pagination: response.meta?.pagination ?? {
      page: Number(params.page ?? 1),
      limit: Number(params.limit ?? items.length),
      total: items.length,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    },
  }
}
