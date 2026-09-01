import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { accountService } from './service'
import type { AccountListFilters } from '../types'

export function useAccounts(filters: AccountListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.accounts.list(filters),
    queryFn: ({ signal }) => accountService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useAccount(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.accounts.detail(id ?? ''),
    queryFn: ({ signal }) => accountService.get(id!, signal),
    enabled: Boolean(id),
  })
}

export function useAccountPermissions(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.accounts.permissions(id ?? ''),
    queryFn: ({ signal }) => accountService.permissions(id!, signal),
    enabled: Boolean(id),
  })
}
