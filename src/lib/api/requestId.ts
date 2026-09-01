/**
 * Client-generated request correlation ids.
 *
 * Sent as `X-Request-Id` so a failure a user reports can be found in backend
 * logs without guessing from timestamps. The server's own id wins whenever it
 * returns one — this is a fallback for the gap where a request never reached
 * the application (gateway 502, CORS rejection, connection reset) and so
 * never got a server id at all. Those are exactly the failures that are
 * otherwise impossible to trace.
 */

const ID_PREFIX = 'fmr'

export function newRequestId(): string {
  // `randomUUID` needs a secure context; plain http://<lan-ip>:5173 during
  // device testing isn't one, and throwing there would break the app for a
  // debugging id.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return `${ID_PREFIX}-${crypto.randomUUID()}`
    } catch {
      // fall through
    }
  }

  const random = Math.random().toString(36).slice(2, 10)
  return `${ID_PREFIX}-${Date.now().toString(36)}-${random}`
}
