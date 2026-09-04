import { api } from '@/lib/api'
import type {
  OnboardingStatusResult,
  SignupOrganizationInput,
  SignupOrganizationResult,
} from '../types'

const BASE = '/onboarding'

export const onboardingService = {
  /**
   * Creates a tenant and its first administrator.
   *
   * `anonymous: true` — there is no session yet, and a 4xx here means the
   * application was rejected, not that a token expired. Letting it trigger a
   * refresh would be meaningless and would clear the session of anyone who
   * happened to be signed in on the device.
   */
  signup(input: SignupOrganizationInput): Promise<SignupOrganizationResult> {
    return api.post<SignupOrganizationResult>(`${BASE}/signup`, input, {
      anonymous: true,
      operation: 'onboarding.signup',
    })
  },

  status(signal?: AbortSignal): Promise<OnboardingStatusResult> {
    return api.get<OnboardingStatusResult>(`${BASE}/status`, {
      signal,
      operation: 'onboarding.status',
    })
  },
} as const
