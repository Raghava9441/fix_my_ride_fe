import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { useAuthStore } from '@/lib/auth/store'
import type { Account } from '@/features/accounts/types'
import {
  authService,
  type MfaSetupResult,
  type RegisterInput,
  type RegisterResult,
} from './service'

/**
 * Write hooks for auth.
 *
 * One rule runs through all of them: **nothing here writes a token.** Every
 * endpoint that mints a session hands its tokens to `useAuthStore
 * .adoptSession()`, which is the only code path that touches the token store
 * and reads `/auth/me`. Two places that can write tokens is how a session
 * ends up half-established — credentials stored, no user loaded, guards
 * disagreeing with the API about who is signed in.
 */

/**
 * Registration, which **signs the new account in**.
 *
 * `POST /auth/register` returns a token pair, not a "check your email"
 * acknowledgement — the account is usable immediately and email verification
 * is a separate, later step. Anything that treats registration as a dead end
 * ending on a confirmation screen is contradicting the API.
 */
export function useRegister() {
  const adoptSession = useAuthStore((s) => s.adoptSession)

  return useMutation<RegisterResult, ApiError, RegisterInput>({
    mutationKey: ['auth', 'register'],
    mutationFn: (input) => authService.register(input),
    onSuccess: (result) => adoptSession(result),
  })
}

export function useForgotPassword() {
  return useMutation<null, ApiError, string>({
    mutationKey: ['auth', 'forgot-password'],
    mutationFn: (email) => authService.forgotPassword(email),
  })
}

export function useResetPassword() {
  return useMutation<null, ApiError, { token: string; password: string }>({
    mutationKey: ['auth', 'reset-password'],
    mutationFn: (input) => authService.resetPassword(input),
  })
}

export function useResendVerification() {
  return useMutation<null, ApiError, string>({
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
  return useMutation<null, ApiError, { currentPassword: string; newPassword: string }>({
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

  return useMutation<null, ApiError, string>({
    mutationKey: ['auth', 'mfa-enable'],
    mutationFn: (code) => authService.enableMfa(code),
    // `mfaEnabled` lives on the session and drives the security screen.
    onSuccess: () => refreshSession(),
  })
}

/** Takes a current TOTP code — the endpoint does not re-check a password. */
export function useDisableMfa() {
  const refreshSession = useAuthStore((s) => s.refreshSession)

  return useMutation<null, ApiError, { code: string }>({
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
  return useMutation<{ backupCodes: string[] }, ApiError, void>({
    mutationKey: ['auth', 'mfa-backup-codes'],
    mutationFn: () => authService.regenerateBackupCodes(),
  })
}
