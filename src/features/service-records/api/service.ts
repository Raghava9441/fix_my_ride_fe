import { api, fetchPage, request, type Page, type QueryParams } from '@/lib/api'
import type { Document } from '@/features/documents/types'
import type {
  CreateServiceRecordInput,
  NextServiceRecommendation,
  ServiceFeedback,
  ServiceLabor,
  ServicePart,
  ServiceRecord,
  ServiceRecordListFilters,
  ServiceStatus,
  UpdateServiceRecordInput,
} from '../types'

/**
 * Service-record API service — all 22 endpoints under `/api/v1/service-records`.
 *
 * A service record is the hub of the domain: it owns parts, labour,
 * documents, an invoice, feedback, and a next-service recommendation as
 * sub-resources. Each is modelled as its own call rather than being folded
 * into the parent, matching the backend and letting the cache invalidate a
 * single sub-resource without discarding the record.
 */

const BASE = '/service-records'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const serviceRecordService = {
  list(filters: ServiceRecordListFilters = {}, signal?: AbortSignal): Promise<Page<ServiceRecord>> {
    return fetchPage<ServiceRecord>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'serviceRecords.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<ServiceRecord> {
    return api.get<ServiceRecord>(byId(id), { signal, operation: 'serviceRecords.get' })
  },

  create(input: CreateServiceRecordInput): Promise<ServiceRecord> {
    return api.post<ServiceRecord>(BASE, input, { operation: 'serviceRecords.create' })
  },

  update(id: string, input: UpdateServiceRecordInput): Promise<ServiceRecord> {
    return api.put<ServiceRecord>(byId(id), input, { operation: 'serviceRecords.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'serviceRecords.delete' })
  },

  updateStatus(id: string, status: ServiceStatus): Promise<ServiceRecord> {
    return api.patch<ServiceRecord>(`${byId(id)}/status`, { status }, {
      operation: 'serviceRecords.updateStatus',
    })
  },

  /* ---------------- parts ---------------- */

  parts(id: string, signal?: AbortSignal) {
    return api.get<ServicePart[]>(`${byId(id)}/parts`, { signal, operation: 'serviceRecords.parts' })
  },

  addPart(id: string, input: ServicePart) {
    return api.post<ServicePart>(`${byId(id)}/parts`, input, { operation: 'serviceRecords.addPart' })
  },

  updatePart(id: string, partId: string, input: Partial<ServicePart>) {
    return api.put<ServicePart>(`${byId(id)}/parts/${encodeURIComponent(partId)}`, input, {
      operation: 'serviceRecords.updatePart',
    })
  },

  removePart(id: string, partId: string) {
    return api.delete<void>(`${byId(id)}/parts/${encodeURIComponent(partId)}`, {
      operation: 'serviceRecords.removePart',
    })
  },

  /* ---------------- labour ---------------- */

  labor(id: string, signal?: AbortSignal) {
    return api.get<ServiceLabor[]>(`${byId(id)}/labor`, { signal, operation: 'serviceRecords.labor' })
  },

  addLabor(id: string, input: ServiceLabor) {
    return api.post<ServiceLabor>(`${byId(id)}/labor`, input, { operation: 'serviceRecords.addLabor' })
  },

  /* ---------------- documents ---------------- */

  documents(id: string, signal?: AbortSignal) {
    return api.get<Document[]>(`${byId(id)}/documents`, {
      signal,
      operation: 'serviceRecords.documents',
    })
  },

  addDocument(id: string, body: FormData) {
    return api.post<Document>(`${byId(id)}/documents`, body, {
      operation: 'serviceRecords.addDocument',
    })
  },

  removeDocument(id: string, documentId: string) {
    return api.delete<void>(`${byId(id)}/documents/${encodeURIComponent(documentId)}`, {
      operation: 'serviceRecords.removeDocument',
    })
  },

  /* ---------------- invoice ---------------- */

  invoice(id: string, signal?: AbortSignal) {
    return api.get<unknown>(`${byId(id)}/invoice`, { signal, operation: 'serviceRecords.invoice' })
  },

  generateInvoice(id: string) {
    return api.post<unknown>(`${byId(id)}/invoice/generate`, undefined, {
      operation: 'serviceRecords.generateInvoice',
    })
  },

  /**
   * Resolves the invoice download URL rather than fetching the bytes.
   * Streaming a PDF through the JSON client would buffer it in memory for no
   * benefit — hand the URL to an anchor and let the browser do the transfer.
   */
  invoiceDownloadUrl(id: string, signal?: AbortSignal) {
    return request<{ url: string }>({
      url: `${byId(id)}/invoice/download`,
      signal,
      operation: 'serviceRecords.invoiceDownload',
    })
  },

  /* ---------------- feedback & next service ---------------- */

  feedback(id: string, signal?: AbortSignal) {
    return api.get<ServiceFeedback>(`${byId(id)}/feedback`, {
      signal,
      operation: 'serviceRecords.feedback',
    })
  },

  submitFeedback(id: string, input: ServiceFeedback) {
    return api.post<ServiceFeedback>(`${byId(id)}/feedback`, input, {
      operation: 'serviceRecords.submitFeedback',
    })
  },

  nextService(id: string, signal?: AbortSignal) {
    return api.get<NextServiceRecommendation>(`${byId(id)}/next-service`, {
      signal,
      operation: 'serviceRecords.nextService',
    })
  },

  setNextService(id: string, input: NextServiceRecommendation) {
    return api.post<NextServiceRecommendation>(`${byId(id)}/next-service`, input, {
      operation: 'serviceRecords.setNextService',
    })
  },
} as const
