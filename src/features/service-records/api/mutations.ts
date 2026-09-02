import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { serviceRecordService } from './service'
import type {
  CreateServiceRecordInput,
  NextServiceRecommendation,
  ServiceFeedback,
  ServiceLabor,
  ServicePart,
  ServiceRecord,
  ServiceStatus,
  UpdateServiceRecordInput,
} from '../types'

/**
 * Write hooks for service records.
 *
 * Parts and labour both feed the record's cost totals server-side, so those
 * mutations invalidate the record itself rather than only their own
 * sub-resource — otherwise the header keeps showing a total that no longer
 * matches the line items below it.
 */

function invalidateRecord(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.lists() })
}

export function useCreateServiceRecord() {
  const queryClient = useQueryClient()

  return useMutation<ServiceRecord, ApiError, CreateServiceRecordInput>({
    mutationKey: ['service-records', 'create'],
    mutationFn: (input) => serviceRecordService.create(input),
    onSuccess: (record) => {
      queryClient.setQueryData(queryKeys.serviceRecords.detail(record._id), record)
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.lists() })

      // A new record changes the vehicle's service history and its schedule,
      // both of which are cached under the vehicle.
      const vehicleId = typeof record.vehicleId === 'string' ? record.vehicleId : record.vehicleId?._id
      if (vehicleId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) })
      }
    },
  })
}

export function useUpdateServiceRecord(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceRecord, ApiError, UpdateServiceRecordInput>({
    mutationKey: ['service-records', 'update', id],
    mutationFn: (input) => serviceRecordService.update(id, input),
    onSuccess: () => invalidateRecord(queryClient, id),
  })
}

export function useDeleteServiceRecord() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['service-records', 'delete'],
    mutationFn: (id) => serviceRecordService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.serviceRecords.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.lists() })
    },
  })
}

export function useUpdateServiceRecordStatus(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceRecord, ApiError, ServiceStatus, { previous?: ServiceRecord }>({
    mutationKey: ['service-records', 'status', id],
    mutationFn: (status) => serviceRecordService.updateStatus(id, status),

    // Optimistic: status is the field staff change most often, usually from a
    // board where a round-trip delay per card is very visible.
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.serviceRecords.detail(id) })
      const previous = queryClient.getQueryData<ServiceRecord>(queryKeys.serviceRecords.detail(id))
      if (previous) {
        queryClient.setQueryData<ServiceRecord>(queryKeys.serviceRecords.detail(id), {
          ...previous,
          status,
        })
      }
      return { previous }
    },
    onError: (_e, _v, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.serviceRecords.detail(id), context.previous)
      }
    },
    onSettled: () => invalidateRecord(queryClient, id),
  })
}

/* ---------------- parts ---------------- */

export function useAddServicePart(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServicePart, ApiError, ServicePart>({
    mutationKey: ['service-records', 'add-part', id],
    mutationFn: (input) => serviceRecordService.addPart(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.parts(id) })
      // Parts feed the record's cost totals.
      invalidateRecord(queryClient, id)
    },
  })
}

export function useUpdateServicePart(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServicePart, ApiError, { partId: string; input: Partial<ServicePart> }>({
    mutationKey: ['service-records', 'update-part', id],
    mutationFn: ({ partId, input }) => serviceRecordService.updatePart(id, partId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.parts(id) })
      invalidateRecord(queryClient, id)
    },
  })
}

export function useRemoveServicePart(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['service-records', 'remove-part', id],
    mutationFn: (partId) => serviceRecordService.removePart(id, partId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.parts(id) })
      invalidateRecord(queryClient, id)
    },
  })
}

/* ---------------- labour ---------------- */

export function useAddServiceLabor(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceLabor, ApiError, ServiceLabor>({
    mutationKey: ['service-records', 'add-labor', id],
    mutationFn: (input) => serviceRecordService.addLabor(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.labor(id) })
      invalidateRecord(queryClient, id)
    },
  })
}

export function useUpdateServiceLabor(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceLabor, ApiError, { laborId: string; input: Partial<ServiceLabor> }>({
    mutationKey: ['service-records', 'update-labor', id],
    mutationFn: ({ laborId, input }) => serviceRecordService.updateLabor(id, laborId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.labor(id) })
      invalidateRecord(queryClient, id)
    },
  })
}

export function useRemoveServiceLabor(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['service-records', 'remove-labor', id],
    mutationFn: (laborId) => serviceRecordService.removeLabor(id, laborId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.labor(id) })
      invalidateRecord(queryClient, id)
    },
  })
}

/* ---------------- documents ---------------- */

export function useAddServiceRecordDocument(id: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, FormData>({
    mutationKey: ['service-records', 'add-document', id],
    mutationFn: (body) => serviceRecordService.addDocument(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.documents(id) })
    },
  })
}

export function useRemoveServiceRecordDocument(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['service-records', 'remove-document', id],
    mutationFn: (documentId) => serviceRecordService.removeDocument(id, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.documents(id) })
    },
  })
}

/* ---------------- invoice, feedback, next service ---------------- */

export function useGenerateInvoice(id: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, void>({
    mutationKey: ['service-records', 'generate-invoice', id],
    mutationFn: () => serviceRecordService.generateInvoice(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceRecords.invoice(id) })
      // A generated invoice appears in the invoices list too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
      invalidateRecord(queryClient, id)
    },
  })
}

export function useSubmitServiceFeedback(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceFeedback, ApiError, ServiceFeedback>({
    mutationKey: ['service-records', 'feedback', id],
    mutationFn: (input) => serviceRecordService.submitFeedback(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.serviceRecords.feedback(id), data)
    },
  })
}

export function useSetNextService(id: string) {
  const queryClient = useQueryClient()

  return useMutation<NextServiceRecommendation, ApiError, NextServiceRecommendation>({
    mutationKey: ['service-records', 'next-service', id],
    mutationFn: (input) => serviceRecordService.setNextService(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.serviceRecords.nextService(id), data)
      // A next-service date usually creates or moves a reminder.
      void queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all })
    },
  })
}
