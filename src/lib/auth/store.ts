import { create } from 'zustand'
import { abortAllRequests, api, isApiError, setSessionExpiredHandler } from '../api'
import { resetQueryCache } from '../queryClient'
import { isAccountRole, isRbacRole, type AccountRole } from '../access/roles'
import type { PermissionKey } from '../access/permissions'
import { clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStore'
import type {
  LoginOutcome,
  LoginResponse,
  MeResponse,
  MfaChallenge,
  SessionStatus,
  SessionTokens,
  SessionUser,
} from './types'

/**
 * The server's code for "password accepted, second factor required".
 *
 * Matched on the code rather than the 401 status, because a wrong password is
 * also a 401 and the two need opposite responses — one continues the flow,
 * the other is a dead end.
 */
const MFA_REQUIRED_CODE = 'AUTH_010'

/** Matches the backend's 5-minute signing window for the challenge token. */
const MFA_CHALLENGE_TTL_MS = 5 * 60_000

interface AuthState {
  user: SessionUser | null
  status: SessionStatus
  /**
   * Present between a password accepted and a TOTP code verified. Holds a
   * live credential — see `MfaChallenge`.
   */
  mfaChallenge: MfaChallenge | null
  login: (email: string, password: string) => Promise<LoginOutcome>
  /** Completes a pending MFA challenge. Throws if there is none, or it lapsed. */
  verifyMfa: (code: string) => Promise<void>
  /** Abandons a pending challenge — "use a different account". */
  cancelMfa: () => void
  /**
   * Establishes a session from a token pair, whatever produced it: login,
   * MFA verification, registration, or organisation signup.
   *
   * Every one of those endpoints returns tokens, and each previously would
   * have needed its own copy of "store both, then read /auth/me, in that
   * order". Centralising it here keeps token writes in one file, which is
   * what stops a half-established session — tokens set, user null — from
   * being reachable.
   */
  adoptSession: (tokens: SessionTokens) => Promise<void>
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
  /** Re-reads `/auth/me` — call after anything that changes roles or profile. */
  refreshSession: () => Promise<void>
}

/**
 * Maps the API's raw `Account` document onto the client's session model.
 *
 * `/auth/login` and `/auth/me` return the account under slightly different
 * shapes (`user.role` vs. the document's `primaryRole`, `id` vs. `_id`,
 * `tenantId` populated or as a bare ObjectId string), so both go through
 * here rather than each caller guessing.
 *
 * Unknown role strings are dropped rather than trusted: an unrecognised
 * role must not silently widen access, and a principal with no recognisable
 * role should still get a valid session with empty capabilities rather than
 * crash the app.
 */
function normalizeSession(raw: MeResponse): SessionUser {
  const rawRoles = raw.roles ?? []
  const primaryRaw = raw.primaryRole ?? raw.role
  const roles = [...new Set([...(rawRoles ?? []), ...(primaryRaw ? [primaryRaw] : [])])].filter(isAccountRole)

  const primaryRole: AccountRole =
    primaryRaw && isAccountRole(primaryRaw) ? primaryRaw : (roles[0] ?? 'owner')

  const tenantId = typeof raw.tenantId === 'string' ? raw.tenantId : (raw.tenantId?._id ?? null)

  const name = raw.name ?? [raw.firstName, raw.lastName].filter(Boolean).join(' ')

  // `rbacRole` isn't a field on Account — it only appears when the staff
  // profile has been populated along with its Role. Read it defensively so
  // a populated response is used and a bare one isn't treated as a bug.
  const staffProfile: unknown = raw.staffProfileId
  const rbacSlug =
    staffProfile && typeof staffProfile === 'object'
      ? (staffProfile as { roleId?: { slug?: string } }).roleId?.slug
      : undefined

  return {
    id: raw.id ?? raw._id ?? '',
    email: raw.email,
    name: name || undefined,
    primaryRole,
    roles: roles.length > 0 ? roles : [primaryRole],
    tenantId,
    ownerProfileId: typeof raw.ownerProfileId === 'string' ? raw.ownerProfileId : null,
    staffProfileId: typeof staffProfile === 'string' ? staffProfile : null,
    rbacRole: rbacSlug && isRbacRole(rbacSlug) ? rbacSlug : null,
    permissions: (raw.permissions ?? null) as PermissionKey[] | null,
    mfaEnabled: raw.mfaEnabled ?? false,
    status: raw.status ?? null,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  mfaChallenge: null,

  async adoptSession(tokens) {
    setAccessToken(tokens.accessToken)
    setRefreshToken(tokens.refreshToken)

    try {
      /*
       * `/auth/me` is fetched once, not twice.
       *
       * This previously seeded the store from login's trimmed account and
       * then immediately called `refreshSession()` for the full one — two
       * requests on every sign-in, the second racing the first render. The
       * full account is what capability derivation needs, so fetch that
       * directly and set the session once.
       */
      const me = await api.get<MeResponse>('/auth/me', { operation: 'auth.me' })
      set({ user: normalizeSession(me), status: 'authenticated', mfaChallenge: null })
    } catch (err) {
      // Tokens were written before this failed, so they have to come back
      // out — otherwise the app is left holding credentials for a session it
      // never finished building, and the next request would half-work.
      clearTokens()
      set({ user: null, status: 'unauthenticated' })
      throw err
    }
  },

  async login(email, password) {
    set({ status: 'loading', mfaChallenge: null })
    try {
      const data = await api.post<LoginResponse>(
        '/auth/login',
        { email, password },
        // Anonymous: there is no session yet, and a 401 here means "wrong
        // password", not "token expired" — it must not trigger a refresh.
        { anonymous: true, operation: 'auth.login' },
      )

      await get().adoptSession(data)
      return { kind: 'authenticated' }
    } catch (err) {
      /*
       * An MFA challenge arrives as a *failure*: 401, code AUTH_010, with the
       * challenge token in `details`. So it has to be caught here rather than
       * read off a success body — the previous code checked a `mfaRequired`
       * flag on a 200 that the server never sends, so the branch was
       * unreachable and every MFA user was told their password was wrong.
       */
      if (isApiError(err) && err.is(MFA_REQUIRED_CODE)) {
        const token = err.detailString('mfaToken')
        if (token) {
          set({
            status: 'unauthenticated',
            mfaChallenge: { token, email, expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS },
          })
          return { kind: 'mfa-required', email }
        }
        // Coded as a challenge but carrying no token — nothing the user can
        // act on, so fall through and surface it as a failure rather than
        // stranding them on a code form that cannot succeed.
      }

      clearTokens()
      set({ user: null, status: 'unauthenticated', mfaChallenge: null })
      throw err
    }
  },

  async verifyMfa(code) {
    const challenge = get().mfaChallenge
    if (!challenge) throw new Error('No MFA challenge is pending.')

    /*
     * Checked client-side as well as server-side. The server will reject a
     * lapsed token, but as a generic 401 — which on this screen would read
     * as "wrong code" and send someone hunting for a typo in a code that was
     * correct. Failing early names the real cause.
     */
    if (Date.now() >= challenge.expiresAt) {
      set({ mfaChallenge: null })
      throw new Error('That sign-in request expired. Enter your password again.')
    }

    set({ status: 'loading' })
    try {
      const data = await api.post<SessionTokens>(
        '/auth/mfa/verify',
        { mfaToken: challenge.token, code },
        { anonymous: true, operation: 'auth.mfaVerify' },
      )
      await get().adoptSession(data)
    } catch (err) {
      // The challenge survives a wrong code so the user can retype it; only
      // a lapsed or server-rejected *token* clears it, handled above and by
      // the expiry check on the next attempt.
      set({ status: 'unauthenticated' })
      throw err
    }
  },

  cancelMfa() {
    set({ mfaChallenge: null, status: 'unauthenticated' })
  },

  async logout() {
    const refreshToken = getRefreshToken()
    try {
      // Best-effort server-side revocation. The local session is dropped
      // either way — a failed call must not strand someone signed in.
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }, { operation: 'auth.logout' })
      }
    } catch {
      // Token already expired, or offline. Both land here and are fine.
    } finally {
      clearTokens()
      set({ user: null, status: 'unauthenticated', mfaChallenge: null })

      // Order matters. Cancel in-flight requests first so none of them can
      // resolve and repopulate the cache after it's cleared, then drop every
      // cached response — otherwise the next account to sign in on this
      // device renders the previous user's data until the refetch lands.
      abortAllRequests('signed out')
      resetQueryCache()
    }
  },

  async bootstrap() {
    if (!getRefreshToken()) {
      set({ status: 'unauthenticated' })
      return
    }
    set({ status: 'loading' })
    try {
      // No access token exists in memory yet on a fresh page load, so this
      // 401s once; the client refreshes and replays it transparently.
      const me = await api.get<MeResponse>('/auth/me', { operation: 'auth.me' })
      set({ user: normalizeSession(me), status: 'authenticated' })
    } catch {
      clearTokens()
      set({ user: null, status: 'unauthenticated' })
    }
  },

  async refreshSession() {
    try {
      const me = await api.get<MeResponse>('/auth/me', { operation: 'auth.me' })
      set({ user: normalizeSession(me), status: 'authenticated' })
    } catch {
      // Leave the existing session in place — a transient /auth/me failure
      // shouldn't sign someone out mid-task. A terminal auth failure comes
      // through the session-expired handler below instead.
    }
  },
}))

/*
 * The API layer calls this when a token refresh fails terminally, so the
 * store learns about it without the client importing application state.
 *
 * Note what this does *not* do: navigate. The route guards already redirect
 * on an unauthenticated session and carry `?next=`, so pushing a location
 * from here would race them and lose the destination.
 */
setSessionExpiredHandler(() => {
  useAuthStore.setState({ user: null, status: 'unauthenticated', mfaChallenge: null })
  abortAllRequests('session expired')
  resetQueryCache()
})

/*
 * Dev-only handle for driving the session from the console.
 *
 * Exists because the access layer's whole job is "what does a technician
 * see that an owner doesn't", and answering that otherwise means seeding a
 * database with one account per role and signing in five times. With this,
 * `__fmrAuth.as('staff')` re-derives capabilities, the nav, the command
 * palette, and every guard from the new principal immediately.
 *
 * Stripped from production builds by the `import.meta.env.DEV` guard, which
 * Vite evaluates statically — the block is removed, not merely skipped.
 */
if (import.meta.env.DEV) {
  ;(window as unknown as { __fmrAuth: unknown }).__fmrAuth = {
    store: useAuthStore,
    as(role: AccountRole, overrides: Partial<SessionUser> = {}) {
      useAuthStore.setState({
        status: 'authenticated',
        user: {
          id: 'dev-user',
          email: `${role}@example.dev`,
          name: `Dev ${role}`,
          primaryRole: role,
          roles: [role],
          tenantId: role === 'admin' ? null : 'dev-tenant',
          ownerProfileId: null,
          staffProfileId: null,
          rbacRole: null,
          permissions: null,
          mfaEnabled: false,
          status: 'active',
          ...overrides,
        },
      })
    },
    clear() {
      useAuthStore.setState({ user: null, status: 'unauthenticated', mfaChallenge: null })
    },
  }
}
