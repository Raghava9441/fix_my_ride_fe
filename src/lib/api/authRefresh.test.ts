import { describe, expect, it, vi } from 'vitest'
import { envelope, failure, mockFetch } from '@/test/http'
import { api } from './client'
import { ApiError } from './errors'
import { setSessionExpiredHandler } from './authRefresh'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../auth/tokenStore'

function seedSession() {
  setAccessToken('expired-access')
  setRefreshToken('valid-refresh')
}

describe('token refresh', () => {
  it('refreshes once on 401 and replays the original request', async () => {
    seedSession()
    const http = mockFetch()
    http.respond(
      { status: 401, body: failure(401, 'jwt expired') },
      { status: 200, body: envelope({ accessToken: 'new-access', refreshToken: 'new-refresh' }) },
      { status: 200, body: envelope({ id: 'v1' }) },
    )

    await expect(api.get('/vehicles/v1', { dedupe: false })).resolves.toEqual({ id: 'v1' })

    const urls = http.calls().map((c) => c.url)
    expect(urls[0]).toContain('/vehicles/v1')
    expect(urls[1]).toContain('/auth/refresh-token')
    expect(urls[2]).toContain('/vehicles/v1')

    // The replay must carry the *new* token — reading it once up front is the
    // bug this guards against.
    const replayHeaders = http.calls()[2].init.headers as Record<string, string>
    expect(replayHeaders.Authorization).toBe('Bearer new-access')
  })

  it('stores the rotated refresh token', async () => {
    seedSession()
    const http = mockFetch()
    http.respond(
      { status: 401, body: failure(401) },
      { status: 200, body: envelope({ accessToken: 'new-access', refreshToken: 'rotated-refresh' }) },
      { status: 200, body: envelope(null) },
    )

    await api.get('/vehicles', { dedupe: false })

    // The backend rotates on every refresh; keeping the old one means the
    // next refresh presents a spent token and signs the user out.
    expect(getRefreshToken()).toBe('rotated-refresh')
    expect(getAccessToken()).toBe('new-access')
  })

  it('issues exactly one refresh for concurrent 401s', async () => {
    seedSession()

    // Three different endpoints all 401, then the refresh, then their replays.
    const spy = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = input.toString()
      const headers = init.headers as Record<string, string>

      if (url.includes('/auth/refresh-token')) {
        return new Response(
          JSON.stringify(envelope({ accessToken: 'new-access', refreshToken: 'new-refresh' })),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      if (headers.Authorization === 'Bearer new-access') {
        return new Response(JSON.stringify(envelope({ ok: true })), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify(failure(401)), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', spy)

    await Promise.all([
      api.get('/vehicles', { dedupe: false }),
      api.get('/staff', { dedupe: false }),
      api.get('/invoices', { dedupe: false }),
    ])

    const refreshCalls = spy.mock.calls.filter(([url]) => url.toString().includes('/auth/refresh-token'))
    // Three refreshes would present an already-rotated token twice; the
    // server rejects those as replay and the user is signed out mid-session.
    expect(refreshCalls).toHaveLength(1)
  })

  it('clears the session and notifies once when refresh fails', async () => {
    seedSession()
    const onExpired = vi.fn()
    setSessionExpiredHandler(onExpired)

    const http = mockFetch()
    http.respond({ status: 401, body: failure(401) }, { status: 401, body: failure(401, 'refresh expired') })

    const error = (await api.get('/vehicles', { dedupe: false }).catch((e: unknown) => e)) as ApiError

    expect(error.kind).toBe('unauthenticated')
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(getRefreshToken()).toBeNull()
    expect(getAccessToken()).toBeNull()

    setSessionExpiredHandler(() => {})
  })

  it('does not attempt a refresh when there is no refresh token', async () => {
    setAccessToken(null)
    setRefreshToken(null)

    const http = mockFetch()
    http.respond({ status: 401, body: failure(401) })

    await api.get('/vehicles', { dedupe: false }).catch(() => null)

    expect(http.calls().some((c) => c.url.includes('/auth/refresh-token'))).toBe(false)
  })

  it('refreshes at most once per request — no 401 loop', async () => {
    seedSession()
    const http = mockFetch()
    // Refresh keeps succeeding but the resource keeps 401ing.
    const spy = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString()
      const body = url.includes('/auth/refresh-token')
        ? envelope({ accessToken: 'a', refreshToken: 'r' })
        : failure(401)
      return new Response(JSON.stringify(body), {
        status: url.includes('/auth/refresh-token') ? 200 : 401,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', spy)

    await api.get('/vehicles', { dedupe: false }).catch(() => null)

    const refreshCalls = spy.mock.calls.filter(([url]) => url.toString().includes('/auth/refresh-token'))
    expect(refreshCalls).toHaveLength(1)
    void http
  })

  it('never retries a 401 as if it were transient', async () => {
    setAccessToken(null)
    setRefreshToken(null)

    const http = mockFetch()
    http.respond({ status: 401, body: failure(401) })

    await api.get('/vehicles', { maxRetries: 3, dedupe: false }).catch(() => null)

    // Repeating a 401 can trip account lockout and rate limiting; the
    // credentials are the problem, not the connection.
    expect(http.callCount()).toBe(1)
  })
})
