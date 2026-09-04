/**
 * Organisation onboarding — the shapes `POST /onboarding/signup` and
 * `GET /onboarding/status` actually exchange.
 *
 * Field names mirror `SignupOrganizationSchema` exactly, including the
 * British/American spellings the API chose (`organizationName`). Renaming
 * them here to read better would mean a mapping layer whose only job is to
 * undo a rename, and a 400 the first time someone forgets it.
 */

/**
 * The tenant's review state.
 *
 * `pending_review`, not `pending` — the value comes straight from the
 * `Tenant.onboarding.status` enum and a shortened guess here would silently
 * never match, leaving the "awaiting review" branch dead in exactly the way
 * the MFA branch was.
 */
export type OnboardingStatus = 'pending_review' | 'approved' | 'rejected'

export interface SignupOrganizationInput {
  ownerFirstName: string
  ownerLastName: string
  email: string
  password: string
  organizationName: string
  contactPhone: string
  businessRegistrationNumber: string
  city: string
  /** Optional in the schema — omit rather than sending an empty string. */
  contactEmail?: string
  serviceCenterName?: string
}

/**
 * Signup returns a token pair alongside the new tenant, so the applicant is
 * signed in immediately — into an organisation that is still `pending`.
 */
export interface SignupOrganizationResult {
  id: string
  email: string
  organizationName: string
  organizationSlug: string
  accessToken: string
  refreshToken: string
}

export interface OnboardingStatusResult {
  organizationName: string
  emailVerified: boolean
  onboardingStatus: OnboardingStatus
  rejectionReason?: string
  /** Both gates passed: email verified *and* organisation approved. */
  ready: boolean
}
