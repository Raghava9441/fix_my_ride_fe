import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@/lib/api'
import { onboardingService } from './service'
import type { SignupOrganizationInput, SignupOrganizationResult } from '../types'

/**
 * Submits an organisation application.
 *
 * Deliberately does **not** adopt the session in `onSuccess`, unlike
 * `useRegister`. The onboarding screen has a confirmation step to show first —
 * the organisation is pending review, and dropping someone straight into a
 * workspace without saying so makes a half-locked app look broken. So the
 * caller decides when to establish the session, and this hook just returns
 * the tokens.
 */
export function useSignupOrganization() {
  return useMutation<SignupOrganizationResult, ApiError, SignupOrganizationInput>({
    mutationKey: ['onboarding', 'signup'],
    mutationFn: (input) => onboardingService.signup(input),
  })
}
