import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import type { CreateVehicleInput, Vehicle } from '@/features/vehicles/types'
import { ownerService } from './service'
import type { OwnerNotificationPreferences, OwnerProfile, UpdateOwnerInput } from '../types'

export function useUpdateOwner(id: string) {
  const queryClient = useQueryClient()

  return useMutation<OwnerProfile, ApiError, UpdateOwnerInput>({
    mutationKey: ['owners', 'update', id],
    mutationFn: (input) => ownerService.update(id, input),
    onSuccess: (owner) => {
      queryClient.setQueryData(queryKeys.owners.detail(id), owner)
      void queryClient.invalidateQueries({ queryKey: queryKeys.owners.lists() })
    },
  })
}

export function useDeleteOwner() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['owners', 'delete'],
    mutationFn: (id) => ownerService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.owners.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.owners.lists() })
    },
  })
}

export function useAddOwnerVehicle(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, CreateVehicleInput>({
    mutationKey: ['owners', 'add-vehicle', id],
    mutationFn: (input) => ownerService.addVehicle(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.owners.detail(id) })
      // The vehicle now exists in the global fleet list too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
    },
  })
}

export function useMarkOwnerNotificationRead(id: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, string>({
    mutationKey: ['owners', 'mark-notification-read', id],
    mutationFn: (notificationId) => ownerService.markNotificationRead(id, notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.owners.notifications(id) })
      // The unread badge is served by the global notifications resource.
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useClearOwnerNotifications(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, void>({
    mutationKey: ['owners', 'clear-notifications', id],
    mutationFn: () => ownerService.clearNotifications(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.owners.notifications(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useUpdateOwnerPreferences(id: string) {
  const queryClient = useQueryClient()

  return useMutation<OwnerNotificationPreferences, ApiError, OwnerNotificationPreferences>({
    mutationKey: ['owners', 'update-preferences', id],
    mutationFn: (input) => ownerService.updatePreferences(id, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.owners.preferences(id), data)
    },
  })
}
