import { describe, expect, it, vi } from 'vitest'
import { envelope, failure, mockFetch } from '@/test/http'
import { api, request } from './client'
import { ApiError, isCanceledError } from './errors'
import { retryBudget } from './retry'
import { setAccessToken } from '../auth/tokenStore'

describe('api client — success path', () => {
  it('unwraps the envelope and returns the payload', async () => {
    const http = mockFetch()
    http.respond({ body: envelope({ id: 'v1', make: 'Toyota' }) })

    await expect(api.get('/vehicles/v1')).resolves.toEqual({ id: 'v1', make: 'Toyota' })
  })

  it('keeps envelope meta so pagination is reachable', async () => {
    const http = mockFetch()
    http.respond({
      body: envelope([{ id: 'v1' }], {
        pagination: { page: 2, limit: 20, total: 41, totalPages: 3, hasNext: true, hasPrevious: true },
      }),
    })

    const response = await request<unknown[]>({ url: '/vehicles', params: { page: 2 } })

    // The previous client returned `envelope.data` and dropped meta, which is
    // why server-side pagination was unreachable from the frontend.
    expect(response.meta?.pagination?.total).toBe(41)
    expect(response.meta?.pagination?.hasNext).toBe(true)
  })

  it('serializes params and drops empty ones', async () => {
    const http = mockFetch()
    http.respond({ body: envelope([]) })

    await api.get('/vehicles', { params: { q: 'civic', make: '', page: 2, archived: undefined } })

    const url = http.calls()[0].url
    expect(url).toContain('q=civic')
    expect(url).toContain('page=2')
    expect(url).not.toContain('make=')
    expect(url).not.toContain('archived')
  })

  it('attaches a request id header', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null) })

    await api.get('/vehicles')

    const headers = http.calls()[0].init.headers as Record<string, string>
    expect(headers['X-Request-Id']).toMatch(/^fmr-/)
  })

  it('prefers the server request id when one comes back', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null), headers: { 'X-Request-Id': 'srv-123' } })

    const response = await request({ url: '/vehicles' })
    expect(response.requestId).toBe('srv-123')
  })

  it('returns undefined data for a 204 without inventing a body', async () => {
    const http = mockFetch()
    http.respond({ status: 204, body: undefined, headers: { 'content-type': '' } })

    await expect(api.delete('/vehicles/v1')).resolves.toBeUndefined()
  })
})

describe('api client — error normalization', () => {
  it.each([
    [400, 'validation'],
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [500, 'server'],
    [418, 'client'],
  ])('maps status %i to kind %s', async (status, kind) => {
    const http = mockFetch()
    http.respond({ status, body: failure(status, 'nope') })

    // 401 would otherwise trigger the refresh flow; anonymous skips it.
    const error = await api.get('/thing', { anonymous: true, maxRetries: 0 }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).kind).toBe(kind)
    expect((error as ApiError).status).toBe(status)
  })

  it('surfaces a network failure as kind "network", not a raw TypeError', async () => {
    const http = mockFetch()
    http.respond({ throw: new TypeError('Failed to fetch') })

    const error = await api.get('/vehicles', { maxRetries: 0 }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).kind).toBe('network')
  })

  it('carries field errors through for validation failures', async () => {
    const http = mockFetch()
    http.respond({
      status: 422,
      body: failure(422, 'Invalid', { errors: [{ field: 'year', message: 'must be a number' }] }),
    })

    const error = (await api
      .post('/vehicles', {}, { anonymous: true })
      .catch((e: unknown) => e)) as ApiError

    expect(error.fieldErrors).toEqual([{ field: 'year', message: 'must be a number' }])
  })

  it('rejects a 2xx that carries success:false rather than passing it off as data', async () => {
    const http = mockFetch()
    http.respond({ status: 200, body: failure(200, 'soft failure') })

    const error = await api.get('/vehicles', { maxRetries: 0 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
  })
})

describe('api client — timeout', () => {
  it('aborts a hung request and reports a timeout, not a cancellation', async () => {
    const http = mockFetch()
    http.respond({ hang: true })

    // A timeout aborts the signal, so misordering the checks in the transport
    // would classify this as 'canceled' and silently swallow it.
    const error = (await api
      .get('/vehicles', { timeoutMs: 20, maxRetries: 0 })
      .catch((e: unknown) => e)) as ApiError

    expect(error.kind).toBe('timeout')
    expect(error.retryable).toBe(true)
  })
})

describe('api client — retry', () => {
  it('retries a 500 on GET and succeeds', async () => {
    const http = mockFetch()
    http.respond({ status: 500, body: failure(500) }, { status: 200, body: envelope({ ok: true }) })

    await expect(api.get('/vehicles', { dedupe: false })).resolves.toEqual({ ok: true })
    expect(http.callCount()).toBe(2)
  })

  it('gives up after the configured number of retries', async () => {
    const http = mockFetch()
    http.respond({ status: 503, body: failure(503) })

    await expect(api.get('/vehicles', { maxRetries: 2, dedupe: false })).rejects.toBeInstanceOf(ApiError)
    // 1 initial attempt + 2 retries.
    expect(http.callCount()).toBe(3)
  })

  it('never retries a POST automatically', async () => {
    const http = mockFetch()
    http.respond({ status: 500, body: failure(500) })

    await expect(api.post('/vehicles', { make: 'Toyota' }, { anonymous: true })).rejects.toBeInstanceOf(
      ApiError,
    )
    // The decisive assertion: a retried POST after a timeout can create the
    // record twice, so it must be exactly one call.
    expect(http.callCount()).toBe(1)
  })

  it('retries a POST when the caller explicitly opts in', async () => {
    const http = mockFetch()
    http.respond({ status: 500, body: failure(500) }, { status: 200, body: envelope({ ok: true }) })

    await expect(
      api.post('/idempotent', {}, { anonymous: true, retry: true }),
    ).resolves.toEqual({ ok: true })
    expect(http.callCount()).toBe(2)
  })

  it('does not retry a 404', async () => {
    const http = mockFetch()
    http.respond({ status: 404, body: failure(404) })

    await expect(api.get('/vehicles/missing', { dedupe: false })).rejects.toBeInstanceOf(ApiError)
    expect(http.callCount()).toBe(1)
  })

  it('stops retrying once the global budget is exhausted', async () => {
    const http = mockFetch()
    http.respond({ status: 503, body: failure(503) })

    // Drain the budget so a correlated outage can't multiply into a storm.
    while (retryBudget.tryConsume()) {
      /* drain */
    }

    await expect(api.get('/vehicles', { dedupe: false })).rejects.toBeInstanceOf(ApiError)
    expect(http.callCount()).toBe(1)
  })
})

describe('api client — cancellation', () => {
  it('rethrows the caller’s own abort reason so cancellation stays recognisable', async () => {
    const http = mockFetch()
    http.respond({ hang: true })

    // A server-state library identifies its own cancellations by the reason
    // it aborted with. Replacing that with an ApiError made TanStack Query
    // treat every cancelled query as a genuine failure.
    const reason = new DOMException('Superseded', 'AbortError')
    const controller = new AbortController()
    const promise = api.get('/vehicles', { signal: controller.signal })
    controller.abort(reason)

    const error = await promise.catch((e: unknown) => e)
    expect(error).toBe(reason)
    expect(isCanceledError(error)).toBe(true)
  })

  it('classifies an abort with no explicit reason as a cancellation', async () => {
    const http = mockFetch()
    http.respond({ hang: true })

    const controller = new AbortController()
    const promise = api.get('/vehicles', { signal: controller.signal })
    controller.abort()

    const error = await promise.catch((e: unknown) => e)
    expect(isCanceledError(error)).toBe(true)
  })

  it('does not retry a cancelled request', async () => {
    const http = mockFetch()
    http.respond({ hang: true })

    const controller = new AbortController()
    const promise = api.get('/vehicles', { signal: controller.signal }).catch(() => null)
    controller.abort()
    await promise

    expect(http.callCount()).toBe(1)
  })
})

describe('api client — auth header', () => {
  it('attaches the bearer token', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null) })
    setAccessToken('token-abc')

    await api.get('/vehicles')

    const headers = http.calls()[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-abc')
    setAccessToken(null)
  })

  it('omits the bearer token for anonymous requests', async () => {
    const http = mockFetch()
    http.respond({ body: envelope(null) })
    setAccessToken('token-abc')

    await api.post('/auth/login', {}, { anonymous: true })

    const headers = http.calls()[0].init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    setAccessToken(null)
  })
})

describe('api client — observability', () => {
  it('reports server errors but not cancellations', async () => {
    const { telemetry } = await import('../observability/telemetry')
    const recordError = vi.fn()
    telemetry.register({ name: 'test', recordError })

    const http = mockFetch()
    http.respond({ status: 500, body: failure(500) })
    await api.get('/vehicles', { maxRetries: 0, dedupe: false }).catch(() => null)
    expect(recordError).toHaveBeenCalledTimes(1)

    recordError.mockClear()
    http.respond({ hang: true })
    const controller = new AbortController()
    const promise = api.get('/other', { signal: controller.signal }).catch(() => null)
    controller.abort()
    await promise

    // On a search-as-you-type field cancellations are the majority of all
    // failures; reporting them buries every real error.
    expect(recordError).not.toHaveBeenCalled()
  })
})
