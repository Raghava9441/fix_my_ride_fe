import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import { documentService } from './service'
import type { DocumentEntityType, DocumentListFilters } from '../types'

export function useDocuments(filters: DocumentListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: ({ signal }) => documentService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useEntityDocuments(
  entityType: DocumentEntityType | undefined,
  entityId: string | undefined,
  filters: QueryParams = {},
) {
  return useQuery({
    queryKey: [...queryKeys.documents.byEntity(entityType ?? '', entityId ?? ''), filters] as const,
    queryFn: ({ signal }) => documentService.byEntity(entityType!, entityId!, filters, signal),
    enabled: Boolean(entityType && entityId),
  })
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.documents.detail(id ?? ''),
    queryFn: ({ signal }) => documentService.get(id!, signal),
    enabled: Boolean(id),
  })
}
