import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError, isApiError } from './api/errors'
import { scopedLogger } from './observability/logger'

const log = scopedLogger('query')

/**
 * TanStack Query configuration.
 *
 * ---- Why a server-state library at all ----
 *
 * It was already a dependency here, but the reasoning is worth stating,
 * because the alternative — `useEffect` + `useState` per screen — is what
 * produces most of the defects this refactor is fixing. It supplies, per
 * query key and without per-screen code: deduplication of concurrent
 * subscribers, a cache with staleness, background revalidation, cancellation
 * on unmount, retention across unmount/remount so navigating back doesn't
 * refetch, invalidation as a first-class operation, and — most importantly —
 * the guarantee that a response for a key that is no longer the current one
 * cannot overwrite state. That last property is the race condition in §5 of
 * the brief, and it is genuinely hard to get right by hand in every screen.
 *
 * Server state lives here. Client state (preferences, drawer open, form
 * drafts) stays in Zustand and component state — mixing them means cache
 * invalidation starts clearing UI state, and UI updates start triggering
 * refetches.
 *
 * ---- Why `retry: false` ----
 *
 * The API client already retries with backoff, jitter, idempotency checks,
 * and a global budget (see api/retry.ts). Leaving Query's own retry on would
 * multiply them: 3 transport attempts × 3 query attempts = 9 requests for one
 * failing endpoint. Retry belongs in one layer, and the transport is the
 * layer that can see the method, the status, and the `Retry-After` header.
 */

/** Shared cache instances so the global handlers below are attached to them. */
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Per-query handlers still run; this is the catch-all so a failure is
    // never completely silent, and so cancellations don't reach it as noise.
    if (isApiError(error) && error.isCanceled) return

    log.warn('query failed', {
      queryKey: query.queryKey,
      ...(isApiError(error) ? error.toJSON() : { message: String(error) }),
    })
  },
})

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    if (isApiError(error) && error.isCanceled) return

    log.warn('mutation failed', {
      mutationKey: mutation.options.mutationKey,
      ...(isApiError(error) ? error.toJSON() : { message: String(error) }),
    })
  },
})

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      /**
       * 30s of freshness. Long enough that navigating between screens and
       * back doesn't refetch; short enough that data on a shared workshop
       * screen doesn't go visibly stale.
       */
      staleTime: 30_000,

      /**
       * How long an unused cache entry survives before eviction. The default
       * is 5 minutes; 10 keeps a back-navigation instant on a multi-step
       * flow, and the entries are small. Anything unbounded here is a memory
       * leak in a long-lived tab.
       */
      gcTime: 10 * 60_000,

      // See the note above — retry lives in the transport, not here.
      retry: false,

      /**
       * Revalidate when a tab is re-focused. This was previously off, which
       * meant someone returning to a service-queue tab after an hour saw
       * hour-old data with no indication it was stale. `staleTime` already
       * prevents this from firing on every alt-tab.
       */
      refetchOnWindowFocus: true,

      /** Coming back from offline should refetch — the cache is likely stale. */
      refetchOnReconnect: true,

      /** Remounting a component within the stale window shouldn't refetch. */
      refetchOnMount: true,
    },
    mutations: {
      // Never retry a mutation by default. The client can't tell a lost
      // response from a request the server never received, and repeating a
      // POST that did land creates a duplicate record.
      retry: false,
    },
  },
})

/**
 * Clears every cached server response.
 *
 * Called on sign-out. Without it, the next account to sign in on the same
 * device briefly renders the previous user's cached vehicles and invoices
 * before the refetch lands — a real data-leak class of bug, not just a
 * cosmetic one.
 */
export function resetQueryCache(): void {
  queryClient.cancelQueries()
  queryClient.clear()
}

/** Narrows an unknown query error for a component's error branch. */
export function asApiError(error: unknown): ApiError | null {
  return isApiError(error) ? error : null
}
