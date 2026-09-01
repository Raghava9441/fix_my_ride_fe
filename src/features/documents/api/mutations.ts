import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { documentService } from './service'
import type { Document } from '../types'

/**
 * A document is always attached to something else, so a write invalidates the
 * documents tree wholesale rather than trying to work out which entity's tab
 * is currently on screen. The collection is small and the alternative is a
 * stale attachment list after every upload.
 */
function invalidateDocuments(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation<Document, ApiError, FormData>({
    mutationKey: ['documents', 'upload'],
    mutationFn: (body) => documentService.upload(body),
    onSuccess: (document) => {
      invalidateDocuments(queryClient)

      // The upload also belongs to a parent record's own document tab.
      if (document.entityType === 'vehicle') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.documents(document.entityId) })
      } else if (document.entityType === 'service_record') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.serviceRecords.documents(document.entityId),
        })
      } else if (document.entityType === 'service_center') {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.serviceCenters.documents(document.entityId),
        })
      }
    },
  })
}

export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient()

  return useMutation<
    Document,
    ApiError,
    Partial<Pick<Document, 'description' | 'tags' | 'documentType'>>
  >({
    mutationKey: ['documents', 'update', id],
    mutationFn: (input) => documentService.update(id, input),
    onSuccess: (document) => {
      queryClient.setQueryData(queryKeys.documents.detail(id), document)
      invalidateDocuments(queryClient)
    },
  })
}

export function useVerifyDocument() {
  const queryClient = useQueryClient()

  return useMutation<Document, ApiError, string>({
    mutationKey: ['documents', 'verify'],
    mutationFn: (id) => documentService.verify(id),
    onSuccess: (document) => {
      queryClient.setQueryData(queryKeys.documents.detail(document._id), document)
      invalidateDocuments(queryClient)
    },
  })
}

export function useArchiveDocument() {
  const queryClient = useQueryClient()

  return useMutation<Document, ApiError, string>({
    mutationKey: ['documents', 'archive'],
    mutationFn: (id) => documentService.archive(id),
    onSuccess: () => invalidateDocuments(queryClient),
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['documents', 'delete'],
    mutationFn: (id) => documentService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.documents.detail(id) })
      invalidateDocuments(queryClient)
    },
  })
}
