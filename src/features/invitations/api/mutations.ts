import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { invitationService } from './service'
import type { CreateInvitationInput, Invitation, UpdateInvitationInput } from '../types'

function invalidateInvitations(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()

  return useMutation<Invitation, ApiError, CreateInvitationInput>({
    mutationKey: ['invitations', 'create'],
    mutationFn: (input) => invitationService.create(input),
    onSuccess: () => invalidateInvitations(queryClient),
  })
}

export function useUpdateInvitation(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Invitation, ApiError, UpdateInvitationInput>({
    mutationKey: ['invitations', 'update', id],
    mutationFn: (input) => invitationService.update(id, input),
    onSuccess: () => invalidateInvitations(queryClient),
  })
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['invitations', 'delete'],
    mutationFn: (id) => invitationService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.invitations.detail(id) })
      invalidateInvitations(queryClient)
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation<Invitation, ApiError, string>({
    mutationKey: ['invitations', 'accept'],
    mutationFn: (id) => invitationService.accept(id),
    onSuccess: () => {
      invalidateInvitations(queryClient)

      /*
       * Accepting is the one invitation action that changes what the user can
       * see: it grants access to a vehicle or joins them to a service center.
       * The session's capability set and every scoped list are now stale, so
       * refresh the session and the two resources access is granted over.
       */
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.serviceCenters.all })
    },
  })
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient()

  return useMutation<Invitation, ApiError, string>({
    mutationKey: ['invitations', 'decline'],
    mutationFn: (id) => invitationService.decline(id),
    onSuccess: () => invalidateInvitations(queryClient),
  })
}

export function useResendInvitation() {
  const queryClient = useQueryClient()

  return useMutation<Invitation, ApiError, string>({
    mutationKey: ['invitations', 'resend'],
    mutationFn: (id) => invitationService.resend(id),
    onSuccess: () => invalidateInvitations(queryClient),
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation<Invitation, ApiError, { id: string; reason?: string }>({
    mutationKey: ['invitations', 'revoke'],
    mutationFn: ({ id, reason }) => invitationService.revoke(id, reason),
    onSuccess: () => invalidateInvitations(queryClient),
  })
}
