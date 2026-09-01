import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { setAccessToken, setRefreshToken } from '@/lib/auth/tokenStore'
import { useAuthStore } from '@/lib/auth/store'
import { accountService } from './service'
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  UpdateAccountStatusInput,
} from '../types'

function invalidateAccount(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation<Account, ApiError, CreateAccountInput>({
    mutationKey: ['accounts', 'create'],
    mutationFn: (input) => accountService.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() })
    },
  })
}

export function useUpdateAccount(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Account, ApiError, UpdateAccountInput>({
    mutationKey: ['accounts', 'update', id],
    mutationFn: (input) => accountService.update(id, input),
    onSuccess: () => invalidateAccount(queryClient, id),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['accounts', 'delete'],
    mutationFn: (id) => accountService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.accounts.detail(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.lists() })
    },
  })
}

export function useUpdateAccountStatus(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Account, ApiError, UpdateAccountStatusInput>({
    mutationKey: ['accounts', 'update-status', id],
    mutationFn: (input) => accountService.updateStatus(id, input),
    onSuccess: () => invalidateAccount(queryClient, id),
  })
}

export function useAddAccountRole(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Account, ApiError, string>({
    mutationKey: ['accounts', 'add-role', id],
    mutationFn: (roleId) => accountService.addRole(id, roleId),
    onSuccess: () => {
      invalidateAccount(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.permissions(id) })
      // Could be the signed-in user's own account.
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
    },
  })
}

export function useRemoveAccountRole(id: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['accounts', 'remove-role', id],
    mutationFn: (roleId) => accountService.removeRole(id, roleId),
    onSuccess: () => {
      invalidateAccount(queryClient, id)
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.permissions(id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
    },
  })
}

/**
 * Switches the signed-in account's active role.
 *
 * The role is a JWT claim, so the server issues new tokens rather than
 * flipping a field. Those must be stored *before* the session is re-read, or
 * `/auth/me` is called with the old role still in the header and returns the
 * state we were trying to leave.
 *
 * The whole cache is dropped afterwards: every list the user was looking at
 * was scoped to the previous role, and keeping any of it risks showing a
 * technician rows they only had as a manager.
 */
export function useSwitchRole() {
  const queryClient = useQueryClient()
  const refreshSession = useAuthStore((s) => s.refreshSession)

  return useMutation<{ accessToken: string; refreshToken: string }, ApiError, string>({
    mutationKey: ['accounts', 'switch-role'],
    mutationFn: (role) => accountService.switchRole(role),
    onSuccess: async (tokens) => {
      setAccessToken(tokens.accessToken)
      setRefreshToken(tokens.refreshToken)
      queryClient.clear()
      await refreshSession()
    },
  })
}
