import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { serviceCenterService } from './service'
import type {
  CreateReviewInput,
  CreateServiceCenterInput,
  OfferedService,
  ServiceCenter,
  ServiceCenterReview,
  ServiceCenterSettings,
  UpdateServiceCenterInput,
} from '../types'

function invalidateCenter(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.lists() })
}

export function useCreateServiceCenter() {
  const queryClient = useQueryClient()

  return useMutation<ServiceCenter, ApiError, CreateServiceCenterInput>({
    mutationKey: ['service-centers', 'create'],
    mutationFn: (input) => serviceCenterService.create(input),
    onSuccess: (center) => {
      queryClient.setQueryData(queryKeys.serviceCenters.detail(center._id), center)
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.lists() })
    },
  })
}

export function useUpdateServiceCenter(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceCenter, ApiError, UpdateServiceCenterInput>({
    mutationKey: ['service-centers', 'update', id],
    mutationFn: (input) => serviceCenterService.update(id, input),
    onSuccess: () => invalidateCenter(queryClient, id),
  })
}

export function useDeleteServiceCenter() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['service-centers', 'delete'],
    mutationFn: (id) => serviceCenterService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.serviceCenters.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.lists() })
    },
  })
}

/* ---------------- offered services ---------------- */

export function useAddOfferedService(id: string) {
  const queryClient = useQueryClient()

  return useMutation<OfferedService, ApiError, OfferedService>({
    mutationKey: ['service-centers', 'add-service', id],
    mutationFn: (input) => serviceCenterService.addService(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.services(id) })
    },
  })
}

export function useUpdateOfferedService(id: string) {
  const queryClient = useQueryClient()

  return useMutation<OfferedService, ApiError, { serviceId: string; input: Partial<OfferedService> }>({
    mutationKey: ['service-centers', 'update-service', id],
    mutationFn: ({ serviceId, input }) => serviceCenterService.updateService(id, serviceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.services(id) })
    },
  })
}

export function useRemoveOfferedService(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['service-centers', 'remove-service', id],
    mutationFn: (serviceId) => serviceCenterService.removeService(id, serviceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.services(id) })
    },
  })
}

/* ---------------- reviews, verification, documents, settings ---------------- */

export function useAddServiceCenterReview(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceCenterReview, ApiError, CreateReviewInput>({
    mutationKey: ['service-centers', 'add-review', id],
    mutationFn: (input) => serviceCenterService.addReview(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.reviews(id) })
      // A new review moves the center's average rating, which lives on the
      // detail document and in its stats.
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.detail(id) })
    },
  })
}

export function useVerifyServiceCenter() {
  const queryClient = useQueryClient()

  return useMutation<ServiceCenter, ApiError, string>({
    mutationKey: ['service-centers', 'verify'],
    mutationFn: (id) => serviceCenterService.verify(id),
    onSuccess: (_data, id) => invalidateCenter(queryClient, id),
  })
}

export function useAddServiceCenterDocument(id: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, FormData>({
    mutationKey: ['service-centers', 'add-document', id],
    mutationFn: (body) => serviceCenterService.addDocument(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.documents(id) })
    },
  })
}

export function useUpdateServiceCenterSettings(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ServiceCenterSettings, ApiError, Partial<ServiceCenterSettings>>({
    mutationKey: ['service-centers', 'update-settings', id],
    mutationFn: (input) => serviceCenterService.updateSettings(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.serviceCenters.settings(id), data)
    },
  })
}
