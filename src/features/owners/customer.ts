import type { OwnerProfile } from './types'

/**
 * Presentation helpers for a customer record.
 *
 * "Customer" is the word the product uses — the nav says Customers and so do
 * the screens. `OwnerProfile` / `owners` stay as the API's names because
 * that is what the endpoints and the query keys are called, and renaming
 * them at the boundary would mean a translation layer whose only job is to
 * undo a rename. The split is deliberate: API nouns inward, product nouns
 * on screen.
 */

/**
 * The name to show.
 *
 * `fullName` is a server-side virtual that is present on some responses and
 * absent on others, so it can't be relied on alone — composing from the
 * parts is what keeps a list from showing a blank cell on whichever
 * endpoint didn't include it. The email fallback matters too: a record
 * created by an invitation has an account before it has a name.
 */
export function customerName(owner: Pick<OwnerProfile, 'firstName' | 'lastName' | 'fullName'>): string {
  const composed = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim()
  return owner.fullName?.trim() || composed || 'Unnamed customer'
}

/**
 * The best email we have.
 *
 * `accountId` carries the primary one, but only when the endpoint populated
 * the reference — list responses send a bare id. `alternateEmail` is the
 * field that is reliably on the profile itself, so it leads here and the
 * populated account email is the upgrade when it happens to be there.
 */
export function customerEmail(owner: OwnerProfile): string | undefined {
  const account = owner.accountId
  if (typeof account === 'object' && account?.email) return account.email
  return owner.alternateEmail || undefined
}

/** `City, ST` — the two parts that are worth a column; the rest is detail. */
export function customerLocation(owner: OwnerProfile): string | undefined {
  const parts = [owner.address?.city, owner.address?.state].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

/**
 * Month and year only.
 *
 * A join date is read as "how long have they been with us", and a precise
 * day adds a column's worth of noise to answer a question nobody asked.
 */
export function joinedLabel(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}
