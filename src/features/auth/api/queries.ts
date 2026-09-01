import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { authService } from './service'

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
