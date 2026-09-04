/**
 * The password rules, mirrored from the server.
 *
 * Source of truth is the API's `validatePasswordStrength()` in
 * `utils/password.ts`, called with `{ minLength: 8, requireUppercase,
 * requireLowercase, requireNumbers }` by both `auth.service.register()` and
 * `onboarding.service.signup()`. Symbols are **not** required — demanding one
 * here would reject passwords the server accepts, which is the more annoying
 * direction to be wrong in.
 *
 * This does not replace server validation and cannot: the server checks
 * again, and where the two disagree the server wins. What it buys is telling
 * someone their password is too short *while they are typing it*, rather than
 * after a round trip that also cleared the field.
 *
 * ---- Why the rules are listed rather than scored ----
 *
 * A strength meter that says "weak/medium/strong" is guessing at a policy the
 * server actually enforces exactly. Someone staring at "medium" has no idea
 * what to change. A checklist of the four real rules is honest, actionable,
 * and cannot disagree with the thing that will reject them.
 */

export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
] as const

/** Which rules a candidate password currently fails. Empty means acceptable. */
export function failedPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password))
}

export function isPasswordAcceptable(password: string): boolean {
  return failedPasswordRules(password).length === 0
}

/**
 * A single field-level message, for forms that show one line per field
 * rather than the full checklist.
 *
 * Returns undefined for an empty password: "required" is the form's business,
 * and reporting a policy violation against a field nobody has typed in yet is
 * noise.
 */
export function passwordPolicyError(password: string): string | undefined {
  if (!password) return undefined
  const failed = failedPasswordRules(password)
  if (failed.length === 0) return undefined
  if (failed.length === 1) return `Password needs: ${failed[0].label.toLowerCase()}.`
  return `Password needs: ${failed.map((r) => r.label.toLowerCase()).join(', ')}.`
}
