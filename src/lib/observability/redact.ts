/**
 * Redaction for anything on its way to a log, a metric, or an error report.
 *
 * This is applied at the *sink*, not at the call sites, because "remember to
 * redact" is not a strategy that survives forty engineers and three years.
 * Every log record and every telemetry event passes through here, so a
 * newly-added field carrying a token is scrubbed by default rather than
 * because someone thought about it.
 *
 * The denylist is matched case-insensitively against key names, including
 * partial matches, so `authorization`, `Auth-Token`, `refreshToken`, and
 * `x-api-key` are all covered by their stems.
 */

const SENSITIVE_KEY_PATTERNS = [
  'auth',
  'token',
  'password',
  'passwd',
  'secret',
  'cookie',
  'session',
  'credential',
  'apikey',
  'api_key',
  'otp',
  'mfa',
  'pin',
  'ssn',
  'card',
  'cvv',
  'signature',
]

export const REDACTED = '[redacted]'

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, '')
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalized.includes(pattern.replace(/[-_]/g, '')))
}

/**
 * Values that look like credentials regardless of what they're called.
 * A JWT assigned to `data` is still a JWT.
 */
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi

export function redactString(value: string): string {
  return value.replace(JWT_PATTERN, REDACTED).replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
}

/**
 * Deep-redacts a value. Depth- and breadth-limited: a log line is a
 * diagnostic, not a heap dump, and walking a large API response to log it
 * is itself a performance problem.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 4) return '[depth-limit]'

  if (value === null || value === undefined) return value
  if (typeof value === 'string') return redactString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') return undefined

  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) }
  }

  if (typeof value === 'object') {
    // Cycles are common in DOM/Error/Axios-style objects and would otherwise
    // hang the logger rather than fail loudly.
    if (seen.has(value)) return '[circular]'
    seen.add(value)

    if (Array.isArray(value)) {
      const capped = value.slice(0, 20).map((item) => redact(item, depth + 1, seen))
      return value.length > 20 ? [...capped, `[+${value.length - 20} more]`] : capped
    }

    const out: Record<string, unknown> = {}
    let count = 0
    for (const [key, entry] of Object.entries(value)) {
      if (count++ >= 40) {
        out['[truncated]'] = true
        break
      }
      out[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1, seen)
    }
    return out
  }

  return String(value)
}

/**
 * Strips credentials and PII-ish values from a URL before it is logged.
 * Query strings routinely carry emails and tokens from third-party redirects.
 */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost')

    // Rebuilt by hand rather than via `searchParams.toString()`, which
    // percent-encodes the marker into `%5Bredacted%5D` and makes the log
    // line harder to read than the thing it replaced.
    const pairs = [...parsed.searchParams.entries()].map(([key, value]) =>
      isSensitiveKey(key) ? `${key}=${REDACTED}` : `${key}=${redactString(value)}`,
    )

    return parsed.pathname + (pairs.length ? `?${pairs.join('&')}` : '')
  } catch {
    return redactString(url)
  }
}

/** Exposed for tests, which assert against the exact key list. */
export const __testing = { isSensitiveKey, SENSITIVE_KEY_PATTERNS }
