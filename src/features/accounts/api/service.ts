import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type {
  Account,
  AccountListFilters,
  CreateAccountInput,
  UpdateAccountInput,
  UpdateAccountStatusInput,
} from '../types'

/**
 * Account API service — all 10 endpoints under `/api/v1/accounts`.
 */

const BASE = '/accounts'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const accountService = {
  list(filters: AccountListFilters = {}, signal?: AbortSignal): Promise<Page<Account>> {
    return fetchPage<Account>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'accounts.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Account> {
    return api.get<Account>(byId(id), { signal, operation: 'accounts.get' })
  },

  create(input: CreateAccountInput): Promise<Account> {
    return api.post<Account>(BASE, input, { operation: 'accounts.create' })
  },

  update(id: string, input: UpdateAccountInput): Promise<Account> {
    return api.put<Account>(byId(id), input, { operation: 'accounts.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'accounts.delete' })
  },

  updateStatus(id: string, input: UpdateAccountStatusInput): Promise<Account> {
    return api.patch<Account>(`${byId(id)}/status`, input, { operation: 'accounts.updateStatus' })
  },

  permissions(id: string, signal?: AbortSignal): Promise<string[]> {
    return api.get<string[]>(`${byId(id)}/permissions`, { signal, operation: 'accounts.permissions' })
  },

  addRole(id: string, roleId: string): Promise<Account> {
    return api.post<Account>(`${byId(id)}/roles`, { roleId }, { operation: 'accounts.addRole' })
  },

  removeRole(id: string, roleId: string): Promise<void> {
    return api.delete<void>(`${byId(id)}/roles/${encodeURIComponent(roleId)}`, {
      operation: 'accounts.removeRole',
    })
  },

  /**
   * Switches the caller's active role, for accounts that hold several.
   * Returns fresh tokens — the caller must store them and re-read the
   * session, since the role is a JWT claim.
   */
  switchRole(role: string): Promise<{ accessToken: string; refreshToken: string }> {
    return api.post<{ accessToken: string; refreshToken: string }>(
      `${BASE}/switch-role`,
      { role },
      { operation: 'accounts.switchRole' },
    )
  },
} as const
