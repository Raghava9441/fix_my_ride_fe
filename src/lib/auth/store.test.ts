import { beforeEach, describe, expect, it } from 'vitest'
import { mockFetch, envelope, type FetchMock } from '@/test/http'
import { getAccessToken, getRefreshToken } from './tokenStore'
import { useAuthStore } from './store'

/**
 * Sign-in, and specifically the MFA branch.
 *
 * These exist because of a bug that was invisible for exactly as long as
 * nothing exercised it. The store used to read `mfaRequired` off a *success*
 * body, but the API answers an MFA challenge with a **401 failure envelope**
 * carrying code `AUTH_010`. So the branch was unreachable, the error fell
 * through to the generic 401 handler, and every account with 2FA enabled was
 * told its password was wrong. It type-checked, it linted, and it shipped.
 *
 * The lesson these encode: the interesting cases in an auth flow are the
 * failures, and a "failure" that is really a step in the flow needs a test
 * that asserts it is *not* treated as one.
 */

const ME = {
  _id: 'acc_1',
  email: 'tech@example.com',
  primaryRole: 'staff',
  roles: ['staff'],
  tenantId: 'tenant_1',
  status: 'active',
}

/**
 * The MFA challenge exactly as `auth.routes.ts` builds it.
 *
 * Hand-rolled in the route rather than thrown through the global error
 * handler, which is why it has no `statusCode` field — the client has to take
 * the status from the HTTP response. Reproduced faithfully here so this test
 * would catch a regression in that fallback too.
 */
function mfaChallengeBody(mfaToken = 'mfa-token-abc') {
  return {
    success: false,
    code: 'AUTH_010',
    key: 'auth.mfa_required',
    correlationId: 'corr-1',
    message: 'Multi-factor authentication required',
    details: { mfaToken },
    timestamp: new Date().toISOString(),
  }
}

function resetStore() {
  useAuthStore.setState({ user: null, status: 'idle', mfaChallenge: null })
  localStorage.clear()
}

describe('auth store — sign-in', () => {
  let http: FetchMock

  beforeEach(() => {
    http = mockFetch()
    resetStore()
  })

  it('establishes a session when the password is accepted', async () => {
    http.respond(
      { status: 200, body: envelope({ accessToken: 'access-1', refreshToken: 'refresh-1' }) },
      { status: 200, body: envelope(ME) },
    )

    const outcome = await useAuthStore.getState().login('tech@example.com', 'pw')

    expect(outcome).toEqual({ kind: 'authenticated' })
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.email).toBe('tech@example.com')
    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  describe('MFA challenge', () => {
    it('is reported as a pending challenge, not as a failed sign-in', async () => {
      http.respond({ status: 401, body: mfaChallengeBody() })

      // The load-bearing assertion: this must *resolve*. When it rejected,
      // the login screen rendered "email or password is incorrect" for a
      // password that was correct.
      const outcome = await useAuthStore.getState().login('tech@example.com', 'pw')

      expect(outcome).toEqual({ kind: 'mfa-required', email: 'tech@example.com' })
      expect(useAuthStore.getState().mfaChallenge?.token).toBe('mfa-token-abc')
      expect(useAuthStore.getState().mfaChallenge?.email).toBe('tech@example.com')
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })

    it('does not attempt a token refresh on the challenge 401', async () => {
      http.respond({ status: 401, body: mfaChallengeBody() })
      localStorage.setItem('fmr.refreshToken', 'stale-refresh')

      await useAuthStore.getState().login('tech@example.com', 'pw')

      // One call, to /auth/login. The sign-in request is `anonymous`, so a
      // 401 from it means "wrong credentials" or "second factor needed" —
      // never "the access token expired". Refreshing here would spend a
      // rotating refresh token to answer a question it cannot answer.
      expect(http.callCount()).toBe(1)
      expect(http.calls()[0].url).toContain('/auth/login')
    })

    it('completes the sign-in with a valid code', async () => {
      http.respond({ status: 401, body: mfaChallengeBody() })
      await useAuthStore.getState().login('tech@example.com', 'pw')

      http.respond(
        { status: 200, body: envelope({ accessToken: 'access-2', refreshToken: 'refresh-2' }) },
        { status: 200, body: envelope(ME) },
      )
      await useAuthStore.getState().verifyMfa('123456')

      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useAuthStore.getState().mfaChallenge).toBeNull()
      expect(getAccessToken()).toBe('access-2')

      // The challenge token, not the email or password, is what completes it.
      const verifyCall = http.calls().find((c) => c.url.includes('/auth/mfa/verify'))
      expect(JSON.parse(String(verifyCall?.init.body))).toEqual({
        mfaToken: 'mfa-token-abc',
        code: '123456',
      })
    })

    it('keeps the challenge alive when the code is wrong, so it can be retyped', async () => {
      http.respond({ status: 401, body: mfaChallengeBody() })
      await useAuthStore.getState().login('tech@example.com', 'pw')

      http.respond({ status: 401, body: { ...mfaChallengeBody(), code: 'AUTH_011', details: {} } })
      await expect(useAuthStore.getState().verifyMfa('000000')).rejects.toThrow()

      // Dropping it here would bounce the user back to the password form to
      // start over because of one mistyped digit.
      expect(useAuthStore.getState().mfaChallenge?.token).toBe('mfa-token-abc')
    })

    it('fails with a specific message once the challenge has lapsed', async () => {
      http.respond({ status: 401, body: mfaChallengeBody() })
      await useAuthStore.getState().login('tech@example.com', 'pw')

      // The server signs these for 5 minutes; step past that.
      useAuthStore.setState({
        mfaChallenge: { ...useAuthStore.getState().mfaChallenge!, expiresAt: Date.now() - 1 },
      })

      // Named rather than generic: the server would reject a lapsed token as
      // a bare 401, which on a code form reads as "wrong code" and sends
      // someone hunting for a typo in a code that was correct.
      await expect(useAuthStore.getState().verifyMfa('123456')).rejects.toThrow(/expired/i)
      expect(useAuthStore.getState().mfaChallenge).toBeNull()
    })

    it('treats a challenge with no token as a failure rather than a dead-end form', async () => {
      // Coded as a challenge but carrying nothing to continue with. Showing
      // the code form here would strand the user on an input that cannot
      // succeed, with no way back.
      http.respond({ status: 401, body: { ...mfaChallengeBody(), details: {} } })

      await expect(useAuthStore.getState().login('tech@example.com', 'pw')).rejects.toThrow()
      expect(useAuthStore.getState().mfaChallenge).toBeNull()
    })

    it('is abandoned by cancelMfa', async () => {
      http.respond({ status: 401, body: mfaChallengeBody() })
      await useAuthStore.getState().login('tech@example.com', 'pw')

      useAuthStore.getState().cancelMfa()

      expect(useAuthStore.getState().mfaChallenge).toBeNull()
      expect(useAuthStore.getState().status).toBe('unauthenticated')
    })
  })

  it('surfaces a wrong password as a rejection', async () => {
    http.respond({
      status: 401,
      body: { success: false, statusCode: 401, message: 'Invalid credentials', timestamp: '' },
    })

    await expect(useAuthStore.getState().login('tech@example.com', 'nope')).rejects.toThrow()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(useAuthStore.getState().mfaChallenge).toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('clears tokens when the session cannot be read after a valid login', async () => {
    http.respond(
      { status: 200, body: envelope({ accessToken: 'access-1', refreshToken: 'refresh-1' }) },
      { status: 500, body: { success: false, statusCode: 500, message: 'boom', timestamp: '' } },
    )

    await expect(useAuthStore.getState().login('tech@example.com', 'pw')).rejects.toThrow()

    // Tokens are written before `/auth/me` is read, so a failure there would
    // otherwise leave the app holding credentials for a session it never
    // finished building — signed in as far as the transport is concerned and
    // signed out as far as every guard is concerned.
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })
})
