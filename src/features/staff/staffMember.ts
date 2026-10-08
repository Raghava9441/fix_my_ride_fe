import { isPopulated } from '@/lib/api'
import type { Tone } from '@/components/ui'
import type { EmploymentStatus, EmploymentType, StaffProfile, WorkSchedule } from './types'

/**
 * Presentation helpers for a staff member.
 *
 * ---- The missing name ----
 *
 * There is no name field anywhere on the path to a staff member. `Account`
 * stores none, and `StaffProfile` stores none — first and last names live
 * only on `OwnerProfile`, which a staff-only account does not have. So the
 * email address is the whole identity the API can offer.
 *
 * Rather than render a list of raw addresses, the local part is humanised
 * into a display name and the address is always shown directly beneath it.
 * That keeps the list scannable without pretending to know something it
 * doesn't: nothing is hidden, and the derivation is visible on every row.
 */

export function staffEmail(staff: StaffProfile): string | undefined {
  return isPopulated(staff.accountId) ? staff.accountId.email : undefined
}

/**
 * `jane.smith@shop.com` → `Jane Smith`, `tech1@shop.com` → `Tech1`.
 *
 * Falls back to the employee id and then to the email itself, so a row
 * always has something to show. Separators cover the common address
 * conventions; anything else is left alone rather than mangled.
 */
export function staffDisplayName(staff: StaffProfile): string {
  const email = staffEmail(staff)

  if (email) {
    const local = email.split('@')[0]
    const words = local
      .split(/[._\-+]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))

    if (words.length > 0) return words.join(' ')
  }

  return staff.employeeId || email || 'Unnamed staff member'
}

export function staffRoleName(staff: StaffProfile): string | undefined {
  return isPopulated(staff.roleId) ? staff.roleId.name : undefined
}

export function staffCenterName(staff: StaffProfile): string | undefined {
  return isPopulated(staff.serviceCenterId) ? staff.serviceCenterId.name : undefined
}

/**
 * Employment status as a badge tone.
 *
 * `on_leave` is warning rather than neutral on purpose: someone scanning for
 * who can take a job needs "temporarily unavailable" to read differently
 * from "works here", and neutral reads as unremarkable.
 */
export const EMPLOYMENT_STATUS: Record<EmploymentStatus, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  on_leave: { label: 'On leave', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'critical' },
  terminated: { label: 'Terminated', tone: 'neutral' },
}

export const EMPLOYMENT_STATUS_ORDER: EmploymentStatus[] = [
  'active',
  'on_leave',
  'suspended',
  'terminated',
]

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  contractor: 'Contractor',
  intern: 'Intern',
}

/** Week order for the schedule. Monday first — this is a workplace rota. */
export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type Weekday = (typeof WEEKDAYS)[number]

export function dayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

/**
 * How many days the member is marked available.
 *
 * The API returns every weekday as a key whether or not it has been filled
 * in — an untouched schedule is seven empty objects — so counting keys would
 * report a full week for someone with no hours set at all.
 */
export function availableDayCount(schedule: WorkSchedule | undefined): number {
  if (!schedule) return 0
  return WEEKDAYS.filter((day) => schedule[day]?.available).length
}

/** `09:00–17:00`, or undefined when the day has no hours recorded. */
export function dayHours(schedule: WorkSchedule | undefined, day: string): string | undefined {
  const entry = schedule?.[day]
  if (!entry?.start || !entry?.end) return undefined
  return `${entry.start}–${entry.end}`
}

/** Month and year — a join date answers "how long", not "which day". */
export function joinedLabel(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

/**
 * `vehicle:read_all` → `Vehicle · Read all`.
 *
 * Permission keys are shown to an admin deciding what someone may do, and
 * the raw colon-and-underscore form is read slowly and misread easily.
 */
export function humanizePermission(key: string): string {
  const [resource, action] = key.split(':')
  const words = (value: string) =>
    value
      .split('_')
      .filter(Boolean)
      .join(' ')
      .replace(/^./, (c) => c.toUpperCase())

  return action ? `${words(resource)} · ${words(action)}` : words(key)
}
