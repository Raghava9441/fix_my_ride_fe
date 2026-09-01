import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth/store'
import { setAccessToken, setRefreshToken } from '@/lib/auth/tokenStore'
import type { Account } from '@/features/accounts/types'
import { authService, type MfaSetupResult, type RegisterInput } from './service'

export function useRegister() {
  return useMutation<{ accountId?: string; requiresVerification?: boolean }, ApiError, RegisterInput>({
    mutationKey: ['auth', 'register'],
    mutationFn: (input) => authService.register(input),
  })
}

/**
 * Completes an MFA challenge and establishes the session.
 *
 * Tokens are stored before the session is read, because `/auth/me` needs the
 * new access token in its header — reading first would call it unauthenticated
 * and fail.
 */
export function useVerifyMfa() {
  const refreshSession = useAuthStore((s) => s.refreshSession)

  return useMutation<
    { accessToken: string; refreshToken: string },
    ApiError,
    { email: string; code: string }
  >({
    mutationKey: ['auth', 'verify-mfa'],
    mutationFn: (input) => authService.verifyMfa(input),
    onSuccess: async (tokens) => {
      setAccessToken(tokens.accessToken)
      setRefreshToken(tokens.refreshToken)
      await refreshSession()
    },
  })
}

export function useForgotPassword() {
  return useMutation<{ sent: boolean }, ApiError, string>({
    mutationKey: ['auth', 'forgot-password'],
    mutationFn: (email) => authService.forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation<{ reset: boolean }, ApiError, { token: string; password: string }>({
    mutationKey: ['auth', 'reset-password'],
    mutationFn: (input) => authService.resetPassword(input),
  })
}

export function useResendVerification() {
  return useMutation<{ sent: boolean }, ApiError, string>({
    mutationKey: ['auth', 'resend-verification'],
    mutationFn: (email) => authService.resendVerification(email),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const refreshSession = useAuthStore((s) => s.refreshSession)

  return useMutation<Account, ApiError, Parameters<typeof authService.updateProfile>[0]>({
    mutationKey: ['auth', 'update-profile'],
    mutationFn: (input) => authService.updateProfile(input),
    onSuccess: async () => {
      // The name and avatar in the top bar come from the session, so it has
      // to be re-read rather than just invalidated.
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
      await refreshSession()
    },
  })
}

/**
 * Changes the password.
 *
 * Deliberately does *not* sign the user out or clear tokens. The backend
 * bumps `sessionVersion`, which invalidates other sessions; this one keeps
 * its current tokens. If that changes server-side, this is where the sign-out
 * would go.
 */
export function useChangePassword() {
  return useMutation<{ changed: boolean }, ApiError, { currentPassword: string; newPassword: string }>({
    mutationKey: ['auth', 'change-password'],
    mutationFn: (input) => authService.changePassword(input),
  })
}

export function useSetupMfa() {
  return useMutation<MfaSetupResult, ApiError, void>({
    mutationKey: ['auth', 'mfa-setup'],
    mutationFn: () => authService.setupMfa(),
  })
}

export function useEnableMfa() {
  const refreshSession = useAuthStore((s) => s.refreshSession)

  return useMutation<{ enabled: boolean }, ApiError, string>({
    mutationKey: ['auth', 'mfa-enable'],
    mutationFn: (code) => authService.enableMfa(code),
    // `mfaEnabled` lives on the session and drives the security screen.
    onSuccess: () => refreshSession(),
  })
}

export function useDisableMfa() {
  const refreshSession = useAuthStore((s) => s.refreshSession)

  return useMutation<{ disabled: boolean }, ApiError, { password?: string; code?: string }>({
    mutationKey: ['auth', 'mfa-disable'],
    mutationFn: (input) => authService.disableMfa(input),
    onSuccess: () => refreshSession(),
  })
}

/**
 * Regenerates recovery codes.
 *
 * The result is shown once and never cached — writing it into the query
 * cache would leave a set of live credentials sitting in memory for the rest
 * of the session, readable by anything with a `queryClient` reference.
 */
export function useRegenerateBackupCodes() {
  return useMutation<{ codes: string[] }, ApiError, void>({
    mutationKey: ['auth', 'mfa-backup-codes'],
    mutationFn: () => authService.regenerateBackupCodes(),
  })
}
