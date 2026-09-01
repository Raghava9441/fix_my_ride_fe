import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { vehicleService } from './service'
import type { CreateVehicleInput, UpdateVehicleInput, Vehicle } from '../types'

/**
 * Write hooks for vehicles.
 *
 * Two rules run through all of them:
 *
 *   1. **Mutations are never retried automatically.** A timeout on a POST is
 *      ambiguous — the server may well have processed it — so a retry risks a
 *      duplicate record. The client-wide default (see lib/queryClient.ts) is
 *      `retry: false` for mutations, and nothing here overrides it.
 *
 *   2. **Invalidate by the narrowest key that covers the change.** After
 *      editing one vehicle we invalidate that detail *and* the lists (its row
 *      may have changed), but not `queryKeys.vehicles.all`, which would also
 *      throw away the service-record and document caches hanging off other
 *      vehicles.
 */

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, CreateVehicleInput>({
    mutationKey: ['vehicles', 'create'],
    mutationFn: (input) => vehicleService.create(input),
    onSuccess: (vehicle) => {
      // Seed the detail cache from the response so navigating straight to the
      // new vehicle renders immediately instead of fetching what we just got.
      queryClient.setQueryData(queryKeys.vehicles.detail(vehicle._id), vehicle)
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
    },
  })
}

export function useUpdateVehicle(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, UpdateVehicleInput, { previous?: Vehicle }>({
    mutationKey: ['vehicles', 'update', vehicleId],
    mutationFn: (input) => vehicleService.update(vehicleId, input),

    /**
     * Optimistic update. Worth it here because edits are small, frequent, and
     * almost always succeed — waiting a round trip to see your own typing
     * reflected is the thing that makes an admin screen feel slow.
     *
     * Cancelling in-flight reads first is not optional: a `GET` that resolves
     * after we write the optimistic value would overwrite it with the
     * pre-edit server state, and the change would appear to revert on its own.
     */
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) })

      const previous = queryClient.getQueryData<Vehicle>(queryKeys.vehicles.detail(vehicleId))
      if (previous) {
        queryClient.setQueryData<Vehicle>(queryKeys.vehicles.detail(vehicleId), { ...previous, ...input })
      }

      return { previous }
    },

    onError: (_error, _input, context) => {
      // Roll back to exactly what was there, rather than refetching — the
      // failure may well be a network partition, in which case a refetch
      // fails too and leaves the optimistic value on screen.
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.vehicles.detail(vehicleId), context.previous)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['vehicles', 'delete'],
    mutationFn: (vehicleId) => vehicleService.remove(vehicleId),
    onSuccess: (_data, vehicleId) => {
      // Drop rather than invalidate: refetching a deleted id just produces a
      // 404 and an error toast for something that worked.
      queryClient.removeQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
    },
  })
}
