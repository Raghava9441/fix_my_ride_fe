import { api, API_BASE_URL } from '@/lib/api'
import type { MeResponse } from '@/lib/auth/types'
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

export interface RegisterInput {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  /** Present when registering through an invitation link. */
  invitationToken?: string
}

export interface MfaSetupResult {
  /** `otpauth://` URI for the authenticator app. */
  otpauthUrl?: string
  /** Rendered QR code, usually a data URI. */
  qrCode?: string
  /*
   * The shared secret is intentionally not typed here. It is a credential;
   * the UI shows the QR code and never needs to read, log, or store it.
   */
}

export const authService = {
  register(input: RegisterInput) {
    return api.post<{ accountId?: string; requiresVerification?: boolean }>(`${BASE}/register`, input, {
      anonymous: true,
      operation: 'auth.register',
    })
  },

  /** Completes a sign-in that returned `mfaRequired`. */
  verifyMfa(input: { email: string; code: string }) {
    return api.post<{ accessToken: string; refreshToken: string; user?: MeResponse }>(
      `${BASE}/mfa/verify`,
      input,
      { anonymous: true, operation: 'auth.mfaVerify' },
    )
  },

  forgotPassword(email: string) {
    return api.post<{ sent: boolean }>(`${BASE}/forgot-password`, { email }, {
      anonymous: true,
      operation: 'auth.forgotPassword',
    })
  },

  resetPassword(input: { token: string; password: string }) {
    return api.post<{ reset: boolean }>(`${BASE}/reset-password`, input, {
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

  resendVerification(email: string) {
    return api.post<{ sent: boolean }>(`${BASE}/resend-verification`, { email }, {
      anonymous: true,
      operation: 'auth.resendVerification',
    })
  },

  /* ---------------- authenticated ---------------- */

  updateProfile(input: { firstName?: string; lastName?: string; phone?: string; preferences?: AccountPreferences }) {
    return api.put<Account>(`${BASE}/me`, input, { operation: 'auth.updateProfile' })
  },

  changePassword(input: { currentPassword: string; newPassword: string }) {
    return api.post<{ changed: boolean }>(`${BASE}/change-password`, input, {
      operation: 'auth.changePassword',
    })
  },

  setupMfa() {
    return api.post<MfaSetupResult>(`${BASE}/mfa/setup`, undefined, { operation: 'auth.mfaSetup' })
  },

  enableMfa(code: string) {
    return api.post<{ enabled: boolean }>(`${BASE}/mfa/enable`, { code }, {
      operation: 'auth.mfaEnable',
    })
  },

  disableMfa(input: { password?: string; code?: string }) {
    return api.post<{ disabled: boolean }>(`${BASE}/mfa/disable`, input, {
      operation: 'auth.mfaDisable',
    })
  },

  /** Regenerates single-use recovery codes. Shown once, never re-fetchable. */
  regenerateBackupCodes() {
    return api.post<{ codes: string[] }>(`${BASE}/mfa/backup-codes`, undefined, {
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
