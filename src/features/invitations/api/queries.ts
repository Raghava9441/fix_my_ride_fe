import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { invitationService } from './service'
import type { InvitationListFilters } from '../types'

export function useInvitations(filters: InvitationListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.invitations.list(filters),
    queryFn: ({ signal }) => invitationService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useMyInvitations(filters: InvitationListFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.invitations.mine(), filters] as const,
    queryFn: ({ signal }) => invitationService.mine(filters, signal),
  })
}

export function useInvitation(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invitations.detail(id ?? ''),
    queryFn: ({ signal }) => invitationService.get(id!, signal),
    enabled: Boolean(id),
  })
}

/**
 * Previews an invitation from its token, on the accept screen.
 *
 * Not retried: a bad or expired token will stay bad, and repeating the
 * request only gives a brute-force attempt more chances.
 */
export function useValidateInvitation(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invitations.validate(token ?? ''),
    queryFn: ({ signal }) => invitationService.validate(token!, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  })
}
