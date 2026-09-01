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

export interface OwnerExpenses {
  total?: number
  currency?: string
  byMonth?: Array<{ month: string; total: number }>
  [key: string]: unknown
}
