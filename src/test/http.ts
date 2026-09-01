import { vi } from 'vitest'
import type { ApiEnvelope } from '@/lib/api'

/**
 * A scriptable `fetch` double.
 *
 * Deliberately not MSW. MSW is the right tool for testing *features* against
 * a realistic server, but these are transport tests: they need to assert on
 * the exact number of calls, force a hang to trigger a timeout, and abort
 * mid-flight. Driving `fetch` directly makes those explicit instead of
 * hiding them behind a request-handler abstraction, and adds no dependency.
 */

export interface MockResponseSpec {
  status?: number
  body?: unknown
  headers?: Record<string, string>
  /** Reject with this instead of responding — for network failures. */
  throw?: unknown
  /** Never settle until the signal aborts — for timeout tests. */
  hang?: boolean
}

export function envelope<T>(data: T, meta: Record<string, unknown> | null = null): ApiEnvelope<T> {
  return { success: true, statusCode: 200, message: 'OK', data, meta, timestamp: new Date().toISOString() }
}

export function failure(status: number, message = 'Failed', extra: Record<string, unknown> = {}) {
  return { success: false, statusCode: status, message, timestamp: new Date().toISOString(), ...extra }
}

export interface FetchMock {
  /** Queued responses, consumed in order; the last one repeats. */
  respond: (...specs: MockResponseSpec[]) => void
  calls: () => { url: string; init: RequestInit }[]
  callCount: () => number
  spy: ReturnType<typeof vi.fn>
}

export function mockFetch(): FetchMock {
  let queue: MockResponseSpec[] = []
  const calls: { url: string; init: RequestInit }[] = []

  const spy = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString()
    calls.push({ url, init })

    const spec = queue.length > 1 ? queue.shift()! : (queue[0] ?? { status: 200, body: envelope(null) })

    if (spec.throw) throw spec.throw

    if (spec.hang) {
      // Resolves only when the caller's signal aborts, mirroring a real
      // stalled connection: fetch rejects with the abort reason.
      return new Promise<Response>((_resolve, reject) => {
        const signal = init.signal
        if (!signal) return
        if (signal.aborted) return reject(signal.reason)
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    }

    const status = spec.status ?? 200
    const headers = new Headers({ 'content-type': 'application/json', ...spec.headers })

    return new Response(spec.body === undefined ? null : JSON.stringify(spec.body), { status, headers })
  })

  vi.stubGlobal('fetch', spy)

  return {
    respond: (...specs) => {
      queue = specs
    },
    calls: () => calls,
    callCount: () => calls.length,
    spy,
  }
}
