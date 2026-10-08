import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { staffService } from './service'
import type {
  CreateStaffInput,
  GrantPermissionInput,
  StaffProfile,
  UpdateStaffInput,
  WorkSchedule,
} from '../types'

function invalidateStaff(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()

  return useMutation<StaffProfile, ApiError, CreateStaffInput>({
    mutationKey: ['staff', 'create'],
    mutationFn: (input) => staffService.create(input),
    onSuccess: (staff) => {
      queryClient.setQueryData(queryKeys.staff.detail(staff._id), staff)
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() })
      // The member also appears on their service center's staff tab.
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.all })
    },
  })
}

export function useUpdateStaff(id: string) {
  const queryClient = useQueryClient()

  return useMutation<StaffProfile, ApiError, UpdateStaffInput>({
    mutationKey: ['staff', 'update', id],
    mutationFn: (input) => staffService.update(id, input),
    onSuccess: () => invalidateStaff(queryClient, id),
  })
}

export function useDeleteStaff() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['staff', 'delete'],
    mutationFn: (id) => staffService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.staff.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() })
    },
  })
}

export function useGrantStaffPermission(id: string) {
  const queryClient = useQueryClient()

  return useMutation<StaffProfile, ApiError, GrantPermissionInput>({
    mutationKey: ['staff', 'grant-permission', id],
    mutationFn: (input) => staffService.grantPermission(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.permissions(id) })
      invalidateStaff(queryClient, id)

      /*
       * If the granted permission belongs to the *current* user, their own
       * capability set is now stale — and that set drives which routes and
       * nav items they can reach. The session query owns that, so refresh it
       * rather than leaving the UI gated on yesterday's permissions.
       */
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
    },
  })
}

export function useRevokeStaffPermission(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['staff', 'revoke-permission', id],
    mutationFn: (permissionId) => staffService.revokePermission(id, permissionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff.permissions(id) })
      invalidateStaff(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
    },
  })
}

/**
 * Replaces the weekly schedule.
 *
 * The endpoint answers with the whole updated `StaffProfile`, so the
 * schedule cache is seeded from `workSchedule` on it rather than from the
 * response itself — writing the response straight in would park a profile
 * document where every reader expects a week of days.
 *
 * The profile seeds the detail cache at the same time, since it is exactly
 * the document that query holds and it just came back fresh.
 */
export function useUpdateStaffSchedule(id: string) {
  const queryClient = useQueryClient()

  return useMutation<StaffProfile, ApiError, WorkSchedule>({
    mutationKey: ['staff', 'update-schedule', id],
    mutationFn: (input) => staffService.updateSchedule(id, input),
    onSuccess: (staff, input) => {
      // `?? input` covers an endpoint that answers without echoing the
      // schedule back: the request succeeded, so what we sent is current.
      queryClient.setQueryData(queryKeys.staff.schedule(id), staff?.workSchedule ?? input)
      queryClient.setQueryData(queryKeys.staff.detail(id), staff)
    },
  })
}
