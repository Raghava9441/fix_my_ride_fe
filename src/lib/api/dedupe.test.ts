import { describe, expect, it } from 'vitest'
import { envelope, mockFetch } from '@/test/http'
import { api } from './client'
import { buildDedupeKey, RequestDeduplicator } from './dedupe'
import { isCanceledError } from './errors'

describe('dedupe key', () => {
  it('is stable regardless of param order', () => {
    const a = buildDedupeKey({ method: 'GET', url: '/vehicles', params: { page: 1, q: 'civic' } })
    const b = buildDedupeKey({ method: 'GET', url: '/vehicles', params: { q: 'civic', page: 1 } })
    expect(a).toBe(b)
  })

  it('ignores empty params so `?q=` and no `q` share an entry', () => {
    const a = buildDedupeKey({ method: 'GET', url: '/vehicles', params: { q: '' } })
    const b = buildDedupeKey({ method: 'GET', url: '/vehicles' })
    expect(a).toBe(b)
  })

  it('separates different bodies', () => {
    const a = buildDedupeKey({ method: 'POST', url: '/vehicles', body: { make: 'Toyota' } })
    const b = buildDedupeKey({ method: 'POST', url: '/vehicles', body: { make: 'Honda' } })
    expect(a).not.toBe(b)
  })
})

describe('in-flight deduplication', () => {
  it('collapses concurrent identical GETs into one request', async () => {
    const http = mockFetch()
    http.respond({ body: envelope([{ id: 'v1' }]) })

    const results = await Promise.all([api.get('/vehicles'), api.get('/vehicles'), api.get('/vehicles')])

    expect(http.callCount()).toBe(1)
    expect(results[0]).toEqual(results[1])
    expect(results[1]).toEqual(results[2])
  })

  it('does not collapse different URLs', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null) })

    await Promise.all([api.get('/vehicles'), api.get('/staff')])
    expect(http.callCount()).toBe(2)
  })

  it('issues a fresh request once the first has settled', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null) })

    await api.get('/vehicles')
    await api.get('/vehicles')

    // Deduplication is in-flight only — it is not a cache.
    expect(http.callCount()).toBe(2)
  })

  it('does not dedupe POSTs by default', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null) })

    await Promise.all([
      api.post('/vehicles', { make: 'A' }, { anonymous: true }),
      api.post('/vehicles', { make: 'A' }, { anonymous: true }),
    ])

    expect(http.callCount()).toBe(2)
  })
})

describe('deduplication and cancellation', () => {
  it('one subscriber aborting does not cancel the others', async () => {
    const deduper = new RequestDeduplicator()
    let sharedSignal: AbortSignal | undefined

    const run = (signal: AbortSignal) =>
      new Promise<string>((resolve) => {
        sharedSignal = signal
        setTimeout(() => resolve('done'), 10)
      })

    const first = new AbortController()
    const a = deduper.run('key', run, first.signal)
    const b = deduper.run('key', run, new AbortController().signal)

    expect(b.deduped).toBe(true)

    first.abort()

    await expect(a.promise).rejects.toBeDefined()
    // The decisive assertion: sharing a socket must not mean sharing a
    // cancellation. B is still waiting on data it asked for.
    await expect(b.promise).resolves.toBe('done')
    expect(sharedSignal?.aborted).toBe(false)
  })

  it('aborts the shared request once every subscriber has left', async () => {
    const deduper = new RequestDeduplicator()
    let sharedSignal: AbortSignal | undefined

    const run = (signal: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        sharedSignal = signal
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })

    const first = new AbortController()
    const second = new AbortController()
    const a = deduper.run('key', run, first.signal)
    const b = deduper.run('key', run, second.signal)

    first.abort()
    second.abort()

    await expect(a.promise).rejects.toBeDefined()
    await expect(b.promise).rejects.toBeDefined()
    // Otherwise the request runs to completion with nobody listening —
    // wasted bandwidth and a closure held alive.
    expect(sharedSignal?.aborted).toBe(true)
  })

  it('survives the StrictMode mount/unmount/remount sequence', async () => {
    /*
     * Regression test. React StrictMode mounts, unmounts, then remounts every
     * component in development, so two subscribers join the same request and
     * the first one's signal aborts. A refcount that decremented twice for
     * the aborted subscriber (once on abort, once when the shared promise
     * settled) went negative and cancelled the request for the surviving
     * subscriber — which showed up as every list screen erroring on load.
     */
    const deduper = new RequestDeduplicator()
    let sharedSignal: AbortSignal | undefined

    const run = (signal: AbortSignal) =>
      new Promise<string>((resolve, reject) => {
        sharedSignal = signal
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        setTimeout(() => resolve('data'), 5)
      })

    const firstMount = new AbortController()
    const remount = new AbortController()

    const first = deduper.run('key', run, firstMount.signal)
    const second = deduper.run('key', run, remount.signal)

    // StrictMode tears the first mount down.
    firstMount.abort()
    await expect(first.promise).rejects.toBeDefined()

    // A third subscriber joins after the abort — this is what tipped the
    // broken counter below zero.
    const third = deduper.run('key', run, new AbortController().signal)

    await expect(second.promise).resolves.toBe('data')
    await expect(third.promise).resolves.toBe('data')
    expect(sharedSignal?.aborted).toBe(false)
  })

  it('a caller arriving just after the last subscriber left starts a fresh request', async () => {
    /*
     * Regression test for the eviction-ordering bug.
     *
     * The entry removed itself from the in-flight map in a `.finally()`, one
     * microtask after the shared controller was aborted. A caller arriving in
     * that window joined a corpse — an entry whose controller was already
     * aborted — and was cancelled instantly, with `deduped: true` and a
     * one-millisecond duration. That is exactly the mount/unmount/remount
     * shape StrictMode produces, so every list screen showed a cancelled
     * request on first load.
     */
    const deduper = new RequestDeduplicator()
    const started: AbortSignal[] = []

    const run = (signal: AbortSignal) =>
      new Promise<string>((resolve, reject) => {
        started.push(signal)
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        setTimeout(() => resolve('data'), 5)
      })

    const only = new AbortController()
    const first = deduper.run('key', run, only.signal)

    // Last (and only) subscriber leaves — the shared request is abandoned.
    only.abort()
    await expect(first.promise).rejects.toBeDefined()

    // A new caller in the very next tick must get its own request, not the
    // abandoned one.
    const second = deduper.run('key', run, new AbortController().signal)

    expect(second.deduped).toBe(false)
    await expect(second.promise).resolves.toBe('data')
    expect(started).toHaveLength(2)
  })

  it('a newer search supersedes an older one without the older overwriting it', async () => {
    // The scenario from the brief: "car" -> "car service" -> "car service near me".
    const http = mockFetch()
    http.respond({ hang: true })

    const stale = new AbortController()
    const stalePromise = api
      .get('/vehicles/search', { params: { q: 'car' }, signal: stale.signal })
      .catch((e: unknown) => e)

    stale.abort()

    // The superseded request never resolves, so it cannot land late and
    // overwrite the newer term's results.
    expect(isCanceledError(await stalePromise)).toBe(true)
  })
})
