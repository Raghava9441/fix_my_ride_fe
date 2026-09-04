import { api, API_BASE_URL } from '@/lib/api'
import type { Account, AccountPreferences } from '@/features/accounts/types'

/**
 * Auth API service — the endpoints under `/api/v1/auth` that are callable as
 * XHR.
 *
 * Login, logout, token refresh, and the initial `/auth/me` are deliberately
 * *not* here: they're owned by `lib/auth/store.ts` and `lib/api/authRefresh.ts`
 * because they manage token state, and having two places that can write
 * tokens is how a session ends up in an inconsistent state. This module
 * covers everything else — registration, verification, password, MFA, and
 * profile.
 *
 * Every pre-session call passes `anonymous: true`. Without it a 401 from, say,
 * a bad reset token would be read as "access token expired" and trigger a
 * refresh — clearing the session of a signed-in user who happened to open a
 * reset link.
 */

const BASE = '/auth'

/**
 * `firstName` and `lastName` are required, not optional — `authService
 * .register()` destructures them unconditionally and the account document
 * requires both.
 *
 * `tenantSlug`/`tenantId` join an existing workspace. Creating one goes
 * through `POST /onboarding/signup` instead, which takes the organisation
 * details as well; the two are not interchangeable.
 */
export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  tenantSlug?: string
  tenantId?: string
}

/**
 * What `POST /auth/register` actually answers with.
 *
 * Registration issues tokens: it signs the new account in immediately rather
 * than parking them on a "check your email" screen. Verification is a
 * separate, later step — the account exists and is usable before it happens.
 */
export interface RegisterResult {
  id: string
  email: string
  accessToken: string
  refreshToken: string
}

/** `POST /auth/mfa/verify` and the tokens it completes a sign-in with. */
export interface MfaVerifyResult {
  user?: { id: string; email: string }
  accessToken: string
  refreshToken: string
}

export interface MfaSetupResult {
  /**
   * `otpauth://` URI for the authenticator app. On a phone this is tappable
   * and opens the app directly.
   */
  otpauthUrl: string
  /**
   * Base32 shared secret, for manual entry when scanning isn't possible.
   *
   * A live credential: shown once, never persisted client-side, and never
   * logged — `redact()` strips `secret`-keyed fields at the logging sink.
   */
  secret: string
  /** Single-use recovery codes. Shown once and not retrievable again. */
  backupCodes: string[]
}

export const authService = {
  register(input: RegisterInput) {
    return api.post<RegisterResult>(`${BASE}/register`, input, {
      anonymous: true,
      operation: 'auth.register',
    })
  },

  /**
   * Completes a sign-in that was answered with an MFA challenge.
   *
   * Takes the `mfaToken` from that challenge, **not** the email: the token is
   * a short-lived (5 minute) signed assertion that the password step already
   * passed, so this endpoint never sees a password and cannot be used to
   * brute-force one. Re-sending the email would have meant a second
   * credential check here.
   */
  verifyMfa(input: { mfaToken: string; code: string }) {
    return api.post<MfaVerifyResult>(`${BASE}/mfa/verify`, input, {
      anonymous: true,
      operation: 'auth.mfaVerify',
    })
  },

  /**
   * Always resolves for a well-formed email, whether or not an account
   * exists — the endpoint is deliberately uniform to stop it being used to
   * enumerate registered addresses. The UI must not infer anything from
   * success, and must show the same message either way.
   */
  forgotPassword(email: string) {
    return api.post<null>(`${BASE}/forgot-password`, { email }, {
      anonymous: true,
      operation: 'auth.forgotPassword',
    })
  },

  resetPassword(input: { token: string; password: string }) {
    return api.post<null>(`${BASE}/reset-password`, input, {
      anonymous: true,
      operation: 'auth.resetPassword',
    })
  },

  /** Follows the emailed verification link. GET, per the backend. */
  verifyEmail(token: string, signal?: AbortSignal) {
    return api.get<{ verified: boolean }>(`${BASE}/verify-email`, {
      params: { token },
      anonymous: true,
      signal,
      operation: 'auth.verifyEmail',
    })
  },

  /** Uniform response for the same anti-enumeration reason as forgotPassword. */
  resendVerification(email: string) {
    return api.post<null>(`${BASE}/resend-verification`, { email }, {
      anonymous: true,
      operation: 'auth.resendVerification',
    })
  },

  /* ---------------- authenticated ---------------- */

  /**
   * `phone: null` clears it. `undefined` would be dropped by JSON
   * serialisation and read server-side as "leave unchanged", so an optional
   * field could be set once and never removed.
   */
  updateProfile(input: {
    phone?: string | null
    preferences?: AccountPreferences
  }) {
    return api.put<Account>(`${BASE}/me`, input, { operation: 'auth.updateProfile' })
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return api.post<null>(`${BASE}/change-password`, input, {
      operation: 'auth.changePassword',
    })
  },

  setupMfa() {
    return api.post<MfaSetupResult>(`${BASE}/mfa/setup`, undefined, { operation: 'auth.mfaSetup' })
  },

  enableMfa(code: string) {
    return api.post<null>(`${BASE}/mfa/enable`, { code }, {
      operation: 'auth.mfaEnable',
    })
  },

  /**
   * Takes a current TOTP code. The route reads `req.body.code` only — it does
   * **not** re-check a password, despite what a `password` field here would
   * imply, so don't collect one and give the false impression it's verified.
   */
  disableMfa(input: { code: string }) {
    return api.post<null>(`${BASE}/mfa/disable`, input, {
      operation: 'auth.mfaDisable',
    })
  },

  /** Regenerates single-use recovery codes. Shown once, never re-fetchable. */
  regenerateBackupCodes() {
    return api.post<{ backupCodes: string[] }>(`${BASE}/mfa/backup-codes`, undefined, {
      operation: 'auth.mfaBackupCodes',
    })
  },
} as const

/**
 * OAuth entry points.
 *
 * These are browser redirects, not XHR — the provider needs a top-level
 * navigation to show its consent screen, and an `fetch` to them would be
 * blocked by CORS. So this exposes URLs to navigate to rather than functions
 * that call them.
 *
 * The backend currently answers all of these with 501; the routes exist but
 * the providers aren't wired up yet.
 */
export const oauthUrls = {
  google: `${API_BASE_URL}${BASE}/google`,
  facebook: `${API_BASE_URL}${BASE}/facebook`,
  apple: `${API_BASE_URL}${BASE}/apple`,
} as const
