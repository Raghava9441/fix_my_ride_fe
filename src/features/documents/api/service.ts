import { api, fetchPage, request, type Page, type QueryParams } from '@/lib/api'
import type { Document, DocumentEntityType, DocumentListFilters } from '../types'

/**
 * Document API service — all 9 endpoints under `/api/v1/documents`.
 *
 * This is the one controller in the backend that does a real per-resource
 * authorization check (`document.isAccessibleBy(user, role)` on read and
 * download), so a 403 from here is meaningful rather than incidental.
 */

const BASE = '/documents'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const documentService = {
  list(filters: DocumentListFilters = {}, signal?: AbortSignal): Promise<Page<Document>> {
    return fetchPage<Document>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'documents.list',
    })
  },

  byEntity(
    entityType: DocumentEntityType,
    entityId: string,
    filters: QueryParams = {},
    signal?: AbortSignal,
  ): Promise<Page<Document>> {
    return fetchPage<Document>({
      url: `${BASE}/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      params: filters,
      signal,
      operation: 'documents.byEntity',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Document> {
    return api.get<Document>(byId(id), { signal, operation: 'documents.get' })
  },

  /**
   * Uploads a file. Takes `FormData`, which the transport passes through
   * untouched so the browser can set the multipart boundary.
   *
   * Given a longer timeout than the default: a 15-second budget is right for
   * a JSON round trip and wrong for a photo on a workshop's mobile
   * connection.
   */
  upload(body: FormData): Promise<Document> {
    return api.post<Document>(`${BASE}/upload`, body, {
      timeoutMs: 120_000,
      operation: 'documents.upload',
    })
  },

  update(id: string, input: Partial<Pick<Document, 'description' | 'tags' | 'documentType'>>) {
    return api.put<Document>(byId(id), input, { operation: 'documents.update' })
  },

  verify(id: string): Promise<Document> {
    return api.post<Document>(`${byId(id)}/verify`, undefined, { operation: 'documents.verify' })
  },

  archive(id: string): Promise<Document> {
    return api.post<Document>(`${byId(id)}/archive`, undefined, { operation: 'documents.archive' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'documents.delete' })
  },

  /**
   * Resolves a download URL rather than fetching bytes. Pulling a file
   * through the JSON client would buffer it entirely in memory; hand the URL
   * to an anchor and let the browser stream it.
   */
  downloadUrl(id: string, signal?: AbortSignal) {
    return request<{ url: string }>({
      url: `${byId(id)}/download`,
      signal,
      operation: 'documents.download',
    })
  },
} as const
