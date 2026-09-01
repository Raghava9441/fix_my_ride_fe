import type { QueryParams } from './types'

/**
 * In-flight request coalescing.
 *
 * TanStack Query already deduplicates by query key, which covers the common
 * case. This covers the ones it doesn't: two different query keys whose
 * `queryFn` hits the same endpoint, imperative calls from stores and event
 * handlers, and prefetches racing the render that needs the same data. On a
 * dashboard that mounts six widgets reading the same lookup endpoint, that's
 * five requests saved on every mount.
 *
 * The subtle part is cancellation. Subscribers share one underlying request,
 * so one subscriber aborting must not cancel the others' data. Each gets a
 * promise that rejects on *its own* signal, and the shared request is only
 * aborted once every subscriber has gone away — tracked by refcount.
 */

export function buildDedupeKey(input: {
  method: string
  url: string
  params?: QueryParams
  body?: unknown
}): string {
  const params = input.params
    ? Object.entries(input.params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        // Sorted so `?a=1&b=2` and `?b=2&a=1` share an entry.
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${String(v)}`)
        .join('&')
    : ''

  // Body participates so two different POSTs aren't collapsed. Cheap because
  // deduplication defaults to GET/HEAD, where a body is almost never present.
  let body = ''
  if (input.body !== undefined) {
    try {
      body = JSON.stringify(input.body)
    } catch {
      // Unserializable body — treat as unique rather than risk a wrong match.
      body = `unserializable:${Math.random()}`
    }
  }

  return `${input.method} ${input.url}?${params}#${body}`
}

interface InFlightEntry<T> {
  promise: Promise<T>
  controller: AbortController
  subscribers: number
}

export class RequestDeduplicator {
  private inFlight = new Map<string, InFlightEntry<unknown>>()

  get size(): number {
    return this.inFlight.size
  }

  /**
   * Runs `run` once per key while it is in flight, sharing the result.
   *
   * @param run receives the *shared* signal — abort it only when nobody is
   *            listening any more.
   * @param signal the individual caller's signal.
   * @returns `{ promise, deduped }`; `deduped` is true when this call joined
   *          an existing request rather than starting one, which the metrics
   *          layer records as a dedupe hit.
   */
  run<T>(
    key: string,
    run: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): { promise: Promise<T>; deduped: boolean } {
    const existing = this.inFlight.get(key) as InFlightEntry<T> | undefined

    const entry: InFlightEntry<T> =
      existing ??
      (() => {
        const controller = new AbortController()
        const created: InFlightEntry<T> = {
          controller,
          subscribers: 0,
          promise: run(controller.signal).finally(() => {
            // Always evict, success or failure — a rejected promise must not
            // be handed to the next caller as if it were a live request.
            this.inFlight.delete(key)
          }),
        }
        this.inFlight.set(key, created as InFlightEntry<unknown>)
        return created
      })()

    entry.subscribers++

    const promise = new Promise<T>((resolve, reject) => {
      /*
       * Each subscriber releases its refcount exactly once.
       *
       * The guard is load-bearing. Without it, a subscriber that aborts
       * decrements here *and* again when the shared promise settles and its
       * `.then` handler still runs — the count goes negative, and the next
       * subscriber to abort sees `<= 0` and cancels the shared request out
       * from under everyone still waiting for it. In React StrictMode, where
       * every component mounts, unmounts, and remounts, that fires on
       * essentially every page load.
       */
      let released = false

      const release = (fromAbort: boolean) => {
        if (released) return
        released = true
        entry.subscribers--
        signal?.removeEventListener('abort', onAbort)

        // Only a departing subscriber can cancel the shared request, and
        // only while it's still in flight. The last one out turns off the
        // lights; aborting on the first would break every other caller.
        if (fromAbort && entry.subscribers <= 0 && !entry.controller.signal.aborted) {
          /*
           * Evict before aborting, not after.
           *
           * The entry's own cleanup removes it from the map in a `.finally()`,
           * which runs a microtask after the abort. A caller arriving inside
           * that window would join an entry whose controller is already
           * aborted and be cancelled instantly — which is precisely the
           * mount/unmount/remount shape React StrictMode produces, and what
           * made list screens render a cancelled-request error on load.
           */
          if (this.inFlight.get(key) === (entry as InFlightEntry<unknown>)) {
            this.inFlight.delete(key)
          }
          entry.controller.abort(new DOMException('All subscribers detached', 'AbortError'))
        }
      }

      function onAbort() {
        release(true)
        reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
      }

      if (signal?.aborted) {
        onAbort()
        return
      }
      signal?.addEventListener('abort', onAbort, { once: true })

      entry.promise.then(
        (value) => {
          release(false)
          resolve(value)
        },
        (error: unknown) => {
          release(false)
          reject(error)
        },
      )
    })

    return { promise, deduped: Boolean(existing) }
  }

  /** Aborts everything in flight. Used on sign-out, and by tests. */
  abortAll(reason = 'deduplicator cleared'): void {
    for (const entry of this.inFlight.values()) {
      entry.controller.abort(new DOMException(reason, 'AbortError'))
    }
    this.inFlight.clear()
  }
}

export const requestDeduplicator = new RequestDeduplicator()
