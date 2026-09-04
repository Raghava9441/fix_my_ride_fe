import { ApiError, isApiError } from '@/lib/api'

/**
 * Turning an auth failure into something the user can act on.
 *
 * `ApiError.userMessage` is right almost everywhere in the app and wrong on
 * these screens for one specific kind: `unauthenticated`. Its wording —
 * "your session has expired, sign in again" — is correct when a token lapses
 * mid-session and nonsense on a sign-in form, where there was no session to
 * expire. Everything else (network, timeout, 5xx) already reads correctly and
 * falls through unchanged.
 */

/** The server's stable codes these screens branch on. */
export const AUTH_CODES = {
  mfaRequired: 'AUTH_010',
  mfaInvalid: 'AUTH_011',
  orgPendingApproval: 'AUTH_014',
  orgRejected: 'AUTH_015',
  alreadyExists: 'ALREADY_EXISTS',
} as const

/**
 * How long to wait before a rate-limited action can be retried, as a
 * human phrase — or undefined when the server didn't say.
 *
 * Shown because "too many requests, try again later" with no number is the
 * single most frustrating error state in an auth flow: the user has no way to
 * tell whether to wait five seconds or come back tomorrow, so they hammer it.
 */
export function retryAfterPhrase(error: unknown): string | undefined {
  if (!isApiError(error) || !error.retryAfterMs) return undefined
  const seconds = Math.ceil(error.retryAfterMs / 1000)
  if (seconds <= 90) return `about ${seconds} second${seconds === 1 ? '' : 's'}`
  const minutes = Math.ceil(seconds / 60)
  return `about ${minutes} minute${minutes === 1 ? '' : 's'}`
}

/**
 * The message for a failed sign-in.
 *
 * Does **not** distinguish "no such account" from "wrong password". The
 * server is careful not to leak which it was, and a client that helpfully
 * says "no account with that email" hands an attacker a free account
 * enumeration oracle — undoing the server-side care for a marginal UX gain.
 */
export function signInErrorMessage(error: unknown): string {
  if (!isApiError(error)) return 'Something went wrong. Try again.'

  if (error.is(AUTH_CODES.orgPendingApproval) || error.is(AUTH_CODES.orgRejected)) {
    // These carry a specific, accurate, non-sensitive explanation from the
    // server — surfacing it beats a generic sentence.
    return error.message
  }

  if (error.kind === 'rate_limited') {
    const wait = retryAfterPhrase(error)
    return wait
      ? `Too many sign-in attempts. Try again in ${wait}.`
      : 'Too many sign-in attempts. Wait a moment and try again.'
  }

  if (error.kind === 'unauthenticated' || error.kind === 'validation') {
    return 'Email or password is incorrect.'
  }

  return error.userMessage
}

/**
 * The message for any other auth-screen failure — registration, reset,
 * verification.
 *
 * Server `validation` messages are surfaced verbatim here, unlike on sign-in:
 * on a signup form "password must contain a number" is exactly what the user
 * needs, and there is no credential to leak by saying so.
 */
export function authErrorMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!isApiError(error)) return fallback

  if (error.kind === 'rate_limited') {
    const wait = retryAfterPhrase(error)
    return wait ? `Too many attempts. Try again in ${wait}.` : 'Too many attempts. Wait a moment and try again.'
  }

  if (error.kind === 'validation' || error.is(AUTH_CODES.alreadyExists)) return error.message

  return error.userMessage
}

/**
 * Field-level errors from the server, keyed by field name.
 *
 * Two shapes have to be handled because the API produces both: Zod-validated
 * routes return a populated `errors[]` array, while the hand-thrown
 * `AppError`s in the auth service put the field in `details.field` with the
 * message at the top level. A form that only read the first shape would show
 * "password must contain a number" as a banner with nothing marked on the
 * field it refers to.
 */
export function serverFieldErrors(error: unknown): Array<{ field?: string; message: string }> {
  if (!isApiError(error)) return []
  if (error.fieldErrors.length > 0) return error.fieldErrors

  const field = error.detailString('field')
  return field ? [{ field, message: error.message }] : []
}

/** The correlation id worth putting on screen next to a 5xx. */
export function errorReference(error: unknown): string | undefined {
  if (!isApiError(error)) return undefined
  return error.isReportable ? (error.correlationId ?? error.requestId) : undefined
}

export { ApiError }
