import { create } from 'zustand'
import { apiRequest, setUnauthorizedHandler } from '../api/client'
import { isAccountRole, isRbacRole, type AccountRole } from '../access/roles'
import type { PermissionKey } from '../access/permissions'
import { clearTokens, getRefreshToken, setAccessToken, setRefreshToken } from './tokenStore'
import type { LoginResponse, MeResponse, SessionStatus, SessionUser } from './types'

interface AuthState {
  user: SessionUser | null
  status: SessionStatus
  /** Set when a sign-in needs an MFA code before a session exists. */
  mfaPending: boolean
  login: (email: string, password: string) => Promise<void>
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
  mfaPending: false,

  async login(email, password) {
    set({ status: 'loading', mfaPending: false })
    try {
      const data = await apiRequest<LoginResponse>({
        method: 'POST',
        url: '/auth/login',
        data: { email, password },
      })

      if (data.mfaRequired) {
        set({ status: 'unauthenticated', mfaPending: true })
        return
      }

      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)

      // Login returns a trimmed account; `/auth/me` returns the full one and
      // is what capability derivation reads. Seed from the inline account so
      // the first render is correct, then reconcile — one extra request buys
      // a session shape that never varies by entry point.
      const inline = data.user ?? data.account
      set({ user: inline ? normalizeSession(inline) : null, status: 'authenticated' })
      await get().refreshSession()
    } catch (err) {
      clearTokens()
      set({ user: null, status: 'unauthenticated' })
      throw err
    }
  },

  async logout() {
    // Best-effort server-side revocation. The local session is dropped
    // either way — a failed call must not strand someone signed in.
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await apiRequest({ method: 'POST', url: '/auth/logout', data: { refreshToken } })
      }
    } catch {
      // token already expired, or offline — both land here and are fine
    } finally {
      clearTokens()
      set({ user: null, status: 'unauthenticated', mfaPending: false })
    }
  },

  async bootstrap() {
    if (!getRefreshToken()) {
      set({ status: 'unauthenticated' })
      return
    }
    set({ status: 'loading' })
    try {
      // No access token exists yet on a fresh page load — this 401s once,
      // the client's response interceptor refreshes it, then retries.
      const me = await apiRequest<MeResponse>({ method: 'GET', url: '/auth/me' })
      set({ user: normalizeSession(me), status: 'authenticated' })
    } catch {
      clearTokens()
      set({ user: null, status: 'unauthenticated' })
    }
  },

  async refreshSession() {
    try {
      const me = await apiRequest<MeResponse>({ method: 'GET', url: '/auth/me' })
      set({ user: normalizeSession(me), status: 'authenticated' })
    } catch {
      // Leave the existing session in place — a transient /auth/me failure
      // shouldn't sign someone out mid-task. A genuine 401 is handled by
      // the interceptor registered below.
    }
  },
}))

setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, status: 'unauthenticated' })
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
      useAuthStore.setState({ user: null, status: 'unauthenticated' })
    },
  }
}
