import { useQuery } from '@tanstack/react-query'
import { api, queryKeys } from '@/lib/api'
import type { Account } from '@/features/accounts/types'
import { authService } from './service'

/**
 * The signed-in account in full.
 *
 * The auth store keeps a *normalised* session — id, email, roles, tenant —
 * because that is all the router guards and nav filters need, and holding
 * more would mean re-deriving capabilities on every unrelated profile edit.
 * The profile screen needs the rest of the document: preferences, login
 * history, verification flags. This reads the same endpoint through the query
 * cache, so the two share a request rather than racing each other.
 */
export function useMyAccount() {
  return useQuery({
    queryKey: queryKeys.session.me(),
    queryFn: ({ signal }) => api.get<Account>('/auth/me', { signal, operation: 'auth.me' }),
    staleTime: 60_000,
  })
}

/**
 * Verifies an email address from the token in the link.
 *
 * A query rather than a mutation because the backend exposes it as a GET and
 * the screen runs it on mount. `retry: false` because a bad token stays bad —
 * repeating it only wastes attempts against a rate limiter.
 */
export function useVerifyEmail(token: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.session.all, 'verify-email', token ?? ''] as const,
    queryFn: ({ signal }) => authService.verifyEmail(token!, signal),
    enabled: Boolean(token),
    retry: false,
    // Verification is single-use; re-running it on a remount would report a
    // failure for something that already succeeded.
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
