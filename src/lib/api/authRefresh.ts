import { getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '../auth/tokenStore'
import { scopedLogger } from '../observability/logger'
import { API_BASE_URL, API_CONFIG, REQUEST_ID_HEADER } from './config'
import { newRequestId } from './requestId'
import type { ApiEnvelope } from './types'

const log = scopedLogger('api.auth')

/**
 * Access-token refresh, single-flight.
 *
 *     Request A ─┐
 *     Request B ─┼─▶ 401 ─▶ one refresh ─▶ retry all three
 *     Request C ─┘
 *
 * Three concurrent 401s must produce exactly one refresh call. Firing three
 * is not merely wasteful: with refresh-token rotation the second and third
 * present a token the first has already consumed, the server rejects them as
 * replay, and the user is signed out in the middle of a working session.
 *
 * Deliberately *not* built on the API client — a refresh that went through
 * the client would be subject to the same 401 interception it exists to
 * resolve, and would recurse.
 */

type RefreshOutcome = { ok: true; accessToken: string } | { ok: false; reason: string }

let inFlight: Promise<RefreshOutcome> | null = null

/**
 * Called when refresh fails terminally. The auth store registers itself here
 * rather than being imported, which keeps the API layer free of a dependency
 * on application state (and of the import cycle that would come with it).
 */
let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler
}

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return { ok: false, reason: 'no-refresh-token' }

  const requestId = newRequestId()
  const started = performance.now()

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', [REQUEST_ID_HEADER]: requestId },
      body: JSON.stringify({ refreshToken }),
      // A refresh that hangs blocks every queued request behind it, so it
      // gets a tighter budget than a normal call.
      signal: AbortSignal.timeout(API_CONFIG.timeoutMs),
    })

    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<{
      accessToken: string
      refreshToken: string
    }> | null

    if (!response.ok || !envelope || envelope.success === false) {
      log.warn('token refresh rejected', {
        status: response.status,
        requestId,
        durationMs: Math.round(performance.now() - started),
      })
      return { ok: false, reason: `status-${response.status}` }
    }

    setAccessToken(envelope.data.accessToken)
    // The backend rotates refresh tokens, so the new one must be stored or
    // the *next* refresh presents a token that has already been spent.
    setRefreshToken(envelope.data.refreshToken)

    log.debug('token refreshed', { requestId, durationMs: Math.round(performance.now() - started) })
    return { ok: true, accessToken: envelope.data.accessToken }
  } catch (error) {
    log.warn('token refresh failed', {
      requestId,
      // `redact()` at the sink strips anything sensitive this might carry.
      error: error instanceof Error ? error.message : String(error),
    })
    return { ok: false, reason: 'network' }
  }
}

/**
 * Returns a fresh access token, coalescing concurrent callers onto one
 * refresh. On terminal failure it clears the session exactly once.
 */
export async function refreshAccessToken(): Promise<RefreshOutcome> {
  inFlight ??= performRefresh().finally(() => {
    // Cleared after settling so a later 401 can start a new refresh, while
    // everyone waiting on this one still shares its result.
    inFlight = null
  })

  const outcome = await inFlight

  if (!outcome.ok) {
    clearTokens()
    onSessionExpired?.()
  }

  return outcome
}

/** True while a refresh is in progress — used by tests and the dev inspector. */
export function isRefreshing(): boolean {
  return inFlight !== null
}

/** Test hook: drops any in-flight refresh so cases don't leak into each other. */
export function __resetRefreshState(): void {
  inFlight = null
}
