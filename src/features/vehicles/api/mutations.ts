import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { vehicleService } from './service'
import type {
  AuthorizeServiceCenterInput,
  CreateVehicleInput,
  RecordOdometerInput,
  TransferOwnershipInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleInsurance,
  VehicleWarranty,
} from '../types'

/**
 * Write hooks for vehicles.
 *
 * Two rules run through all of them:
 *
 *   1. **Mutations are never retried automatically.** A timeout on a POST is
 *      ambiguous — the server may well have processed it — so a retry risks a
 *      duplicate. The client-wide default is `retry: false` for mutations and
 *      nothing here overrides it.
 *
 *   2. **Invalidate by the narrowest key that covers the change.** Editing one
 *      vehicle invalidates that detail and the lists (its row may have
 *      changed), but not `queryKeys.vehicles.all`, which would also discard
 *      every *other* vehicle's cached sub-resources.
 */

/** Sub-resource writes all invalidate the same two things. */
function invalidateVehicle(queryClient: QueryClient, vehicleId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.detail(vehicleId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, CreateVehicleInput>({
    mutationKey: ['vehicles', 'create'],
    mutationFn: (input) => vehicleService.create(input),
    onSuccess: (vehicle) => {
      // Seed the detail cache from the response so navigating straight to the
      // new vehicle renders immediately instead of refetching what we just got.
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
     * Optimistic. Worth it here because edits are small, frequent, and almost
     * always succeed — waiting a round trip to see your own typing reflected
     * is what makes an admin screen feel slow.
     *
     * Cancelling in-flight reads first is not optional: a GET that resolves
     * after we write the optimistic value would overwrite it with pre-edit
     * server state, and the change would appear to revert on its own.
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
      // Roll back to exactly what was there rather than refetching — the
      // failure may be a network partition, in which case a refetch fails too
      // and leaves the optimistic value on screen.
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.vehicles.detail(vehicleId), context.previous)
      }
    },

    onSettled: () => invalidateVehicle(queryClient, vehicleId),
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

/* ---------------- authorized service centers ---------------- */

export function useAuthorizeServiceCenter(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, AuthorizeServiceCenterInput>({
    mutationKey: ['vehicles', 'authorize-center', vehicleId],
    mutationFn: (input) => vehicleService.authorizeServiceCenter(vehicleId, input),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

export function useUpdateServiceCenterAccess(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, { centerId: string; accessLevel?: string; isPrimary?: boolean }>({
    mutationKey: ['vehicles', 'update-center-access', vehicleId],
    mutationFn: ({ centerId, ...input }) =>
      vehicleService.updateServiceCenterAccess(vehicleId, centerId, input),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

export function useRevokeServiceCenter(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['vehicles', 'revoke-center', vehicleId],
    mutationFn: (centerId) => vehicleService.revokeServiceCenter(vehicleId, centerId),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

/* ---------------- odometer ---------------- */

export function useRecordOdometer(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, RecordOdometerInput>({
    mutationKey: ['vehicles', 'record-odometer', vehicleId],
    mutationFn: (input) => vehicleService.recordOdometer(vehicleId, input),
    onSuccess: () => {
      // A new reading changes the vehicle's current odometer *and* the
      // history and readings collections hanging off it.
      invalidateVehicle(queryClient, vehicleId)
    },
  })
}

export function useCreateOdometerReading(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, RecordOdometerInput>({
    mutationKey: ['vehicles', 'create-odometer-reading', vehicleId],
    mutationFn: (input) => vehicleService.createOdometerReading(vehicleId, input),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

export function useUpdateOdometerReading(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, { readingId: string; input: Partial<RecordOdometerInput> }>({
    mutationKey: ['vehicles', 'update-odometer-reading', vehicleId],
    mutationFn: ({ readingId, input }) =>
      vehicleService.updateOdometerReading(vehicleId, readingId, input),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

export function useVerifyOdometerReading(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, string>({
    mutationKey: ['vehicles', 'verify-odometer-reading', vehicleId],
    mutationFn: (readingId) => vehicleService.verifyOdometerReading(vehicleId, readingId),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

export function useDeleteOdometerReading(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['vehicles', 'delete-odometer-reading', vehicleId],
    mutationFn: (readingId) => vehicleService.deleteOdometerReading(vehicleId, readingId),
    onSuccess: () => invalidateVehicle(queryClient, vehicleId),
  })
}

/* ---------------- documents ---------------- */

export function useAddVehicleDocument(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, ApiError, FormData>({
    mutationKey: ['vehicles', 'add-document', vehicleId],
    mutationFn: (body) => vehicleService.addDocument(vehicleId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.documents(vehicleId) })
    },
  })
}

export function useRemoveVehicleDocument(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['vehicles', 'remove-document', vehicleId],
    mutationFn: (documentId) => vehicleService.removeDocument(vehicleId, documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.documents(vehicleId) })
    },
  })
}

/* ---------------- warranty, insurance, ownership ---------------- */

export function useUpdateWarranty(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<VehicleWarranty, ApiError, VehicleWarranty>({
    mutationKey: ['vehicles', 'update-warranty', vehicleId],
    mutationFn: (input) => vehicleService.updateWarranty(vehicleId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.vehicles.warranty(vehicleId), data)
    },
  })
}

export function useUpdateInsurance(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<VehicleInsurance, ApiError, VehicleInsurance>({
    mutationKey: ['vehicles', 'update-insurance', vehicleId],
    mutationFn: (input) => vehicleService.updateInsurance(vehicleId, input),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.vehicles.insurance(vehicleId), data)
    },
  })
}

export function useTransferOwnership(vehicleId: string) {
  const queryClient = useQueryClient()

  return useMutation<Vehicle, ApiError, TransferOwnershipInput>({
    mutationKey: ['vehicles', 'transfer-ownership', vehicleId],
    mutationFn: (input) => vehicleService.transferOwnership(vehicleId, input),
    onSuccess: () => {
      invalidateVehicle(queryClient, vehicleId)
      // The vehicle moves between owners, so both owners' vehicle lists are
      // now wrong. We don't know the previous owner's id here, so invalidate
      // the owners tree rather than guess.
      void queryClient.invalidateQueries({ queryKey: queryKeys.owners.all })
    },
  })
}
