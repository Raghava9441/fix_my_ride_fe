import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MIN_LENGTH,
  failedPasswordRules,
  isPasswordAcceptable,
  passwordPolicyError,
} from './passwordPolicy'

/**
 * These assert the client's rules against the *server's* policy, which is
 * `validatePasswordStrength(password, { minLength: 8, requireUppercase,
 * requireLowercase, requireNumbers })` in the API's `utils/password.ts`.
 *
 * The failure mode being guarded against is drift in either direction, and
 * they are not symmetrical:
 *
 *   - Client stricter than server → the form rejects a password the API would
 *     have accepted. Annoying, visible, and someone will report it.
 *   - Client looser than server → the form accepts, the request fails, and
 *     the user is shown a rejection for a rule they were never told about.
 *     That one is worse and much harder to notice.
 */
describe('password policy', () => {
  it('matches the server minimum length', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })

  it('accepts a password that satisfies all four server rules', () => {
    expect(isPasswordAcceptable('Workshop1')).toBe(true)
  })

  it.each([
    ['Short1a', 'length', 'seven characters'],
    ['alllowercase1', 'uppercase', 'no uppercase'],
    ['ALLUPPERCASE1', 'lowercase', 'no lowercase'],
    ['NoDigitsHere', 'number', 'no digit'],
  ])('rejects %s (%s)', (password, ruleId) => {
    expect(isPasswordAcceptable(password)).toBe(false)
    expect(failedPasswordRules(password).map((r) => r.id)).toContain(ruleId)
  })

  it('does not require a symbol, because the server does not', () => {
    // `requireSymbols` defaults to false and neither caller overrides it.
    // Demanding one here would reject passwords the API accepts.
    expect(isPasswordAcceptable('Workshop1')).toBe(true)
    expect(failedPasswordRules('Workshop1')).toHaveLength(0)
  })

  it('reports nothing for an empty field', () => {
    // "Required" is the form's business. Listing policy violations against a
    // field nobody has typed in yet is noise on first paint.
    expect(passwordPolicyError('')).toBeUndefined()
  })

  it('names every unmet rule at once rather than one at a time', () => {
    // Revealing them one per submit turns a single fix into four round trips.
    const message = passwordPolicyError('short')
    expect(message).toMatch(/8 characters/)
    expect(message).toMatch(/uppercase/)
    expect(message).toMatch(/number/)
  })
})
