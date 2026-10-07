import type { Address, BaseDocument, Id, IsoDate, ListParams, Ref } from '@/lib/api/domain'

export interface OwnerNotificationPreferences {
  serviceReminders?: { email?: boolean; sms?: boolean; push?: boolean }
  invoiceNotifications?: { email?: boolean; sms?: boolean }
  centerCommunications?: { email?: boolean; sms?: boolean }
  quietHours?: { enabled?: boolean; start?: string; end?: string }
}

export interface OwnerStats {
  totalVehicles: number
  totalServices: number
  totalSpent: number
  memberSince: IsoDate
}

export interface OwnerProfile extends BaseDocument {
  accountId: Ref<{ _id: Id; email?: string }>
  firstName: string
  lastName: string
  /** Server-side virtual — present on responses, not on writes. */
  fullName?: string
  profileImage?: string
  alternateEmail?: string
  alternatePhone?: string
  address?: Address & { coordinates?: number[] }
  vehicles?: Array<{ vehicleId?: Id; addedAt: IsoDate; isPrimary: boolean }>
  defaultVehicleId?: Id
  preferredServiceCenterId?: Id
  notificationPreferences?: OwnerNotificationPreferences
  stats?: OwnerStats
}

export interface OwnerListFilters extends ListParams {
  serviceCenterId?: Id
  [key: string]: string | number | boolean | undefined
}

export interface UpdateOwnerInput {
  firstName?: string
  lastName?: string
  alternateEmail?: string
  alternatePhone?: string
  address?: Address
  defaultVehicleId?: Id
  preferredServiceCenterId?: Id
}

/**
 * What `GET /owners/:id/expenses` actually answers with.
 *
 * `breakdown` is keyed by service type — `{ maintenance: 486, repair: 120 }`
 * — not by month. An earlier guess here declared `byMonth`, which the
 * endpoint has never sent: a field that is always `undefined` reads at the
 * call site as "this customer has no monthly data" rather than "nobody has
 * ever returned this", so the branch behind it is dead and silently so. The
 * index signature stays for fields the API adds later.
 */
export interface OwnerExpenses {
  total?: number
  currency?: string
  breakdown?: Record<string, number>
  [key: string]: unknown
}
