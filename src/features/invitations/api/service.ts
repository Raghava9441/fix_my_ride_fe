import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type {
  CreateInvitationInput,
  Invitation,
  InvitationListFilters,
  InvitationPreview,
  UpdateInvitationInput,
} from '../types'

/**
 * Invitation API service — all 11 endpoints under `/api/v1/invitations`.
 */

const BASE = '/invitations'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const invitationService = {
  /**
   * Validates an invitation token before the recipient has a session.
   *
   * `anonymous: true` matters here: the recipient is typically signed out,
   * and a 401 on this call means "bad token", not "expired session" — letting
   * it trigger a refresh would be wrong and would clear a session that a
   * signed-in user following the link still has.
   */
  validate(token: string, signal?: AbortSignal): Promise<InvitationPreview> {
    return api.get<InvitationPreview>(`${BASE}/validate`, {
      params: { token },
      anonymous: true,
      signal,
      operation: 'invitations.validate',
    })
  },

  list(filters: InvitationListFilters = {}, signal?: AbortSignal): Promise<Page<Invitation>> {
    return fetchPage<Invitation>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'invitations.list',
    })
  },

  /** Invitations addressed to the signed-in account. */
  mine(filters: InvitationListFilters = {}, signal?: AbortSignal): Promise<Page<Invitation>> {
    return fetchPage<Invitation>({
      url: `${BASE}/me`,
      params: filters as QueryParams,
      signal,
      operation: 'invitations.mine',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Invitation> {
    return api.get<Invitation>(byId(id), { signal, operation: 'invitations.get' })
  },

  create(input: CreateInvitationInput): Promise<Invitation> {
    return api.post<Invitation>(BASE, input, { operation: 'invitations.create' })
  },

  update(id: string, input: UpdateInvitationInput): Promise<Invitation> {
    return api.put<Invitation>(byId(id), input, { operation: 'invitations.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'invitations.delete' })
  },

  accept(id: string): Promise<Invitation> {
    return api.post<Invitation>(`${byId(id)}/accept`, undefined, {
      operation: 'invitations.accept',
    })
  },

  decline(id: string): Promise<Invitation> {
    return api.post<Invitation>(`${byId(id)}/decline`, undefined, {
      operation: 'invitations.decline',
    })
  },

  resend(id: string): Promise<Invitation> {
    return api.post<Invitation>(`${byId(id)}/resend`, undefined, {
      operation: 'invitations.resend',
    })
  },

  revoke(id: string, reason?: string): Promise<Invitation> {
    return api.post<Invitation>(`${byId(id)}/revoke`, { reason }, {
      operation: 'invitations.revoke',
    })
  },
} as const
