import type { BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'
import type { AccountRole } from '@/lib/access'

export type AccountStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted' | 'locked'
export type AuthProvider = 'email' | 'google' | 'facebook' | 'apple' | 'microsoft'

export interface AccountPreferences {
  language?: string
  timezone?: string
  currency?: string
  notificationPreferences?: {
    email?: { marketing?: boolean; transactional?: boolean; security?: boolean }
    sms?: { enabled?: boolean; marketing?: boolean }
    push?: { enabled?: boolean }
  }
}

export interface LoginHistoryEntry {
  timestamp: IsoDate
  ipAddress?: string
  userAgent?: string
  location?: string
  successful: boolean
}

/**
 * An account as returned by the API.
 *
 * Note what is *not* modelled: `passwordHash`, `mfaSecret`,
 * `mfaBackupCodes`, `emailVerificationToken`, and `passwordResetToken`. Those
 * exist on the server document, and the client must never depend on them
 * arriving — typing them here would invite a component to render one.
 */
export interface Account extends BaseDocument {
  email: string
  phone?: string
  authProvider: AuthProvider
  primaryRole: AccountRole
  roles: string[]
  ownerProfileId?: Id
  staffProfileId?: Id
  tenantId?: Id
  mfaEnabled: boolean
  emailVerified: boolean
  phoneVerified: boolean
  lastLoginAt?: IsoDate
  lastActiveAt?: IsoDate
  loginHistory?: LoginHistoryEntry[]
  status: AccountStatus
  suspensionReason?: string
  lockedUntil?: IsoDate
  preferences?: AccountPreferences
}

export interface AccountListFilters extends ListParams {
  status?: AccountStatus
  primaryRole?: AccountRole
  tenantId?: Id
  [key: string]: string | number | boolean | undefined
}

export interface CreateAccountInput {
  email: string
  phone?: string
  password?: string
  primaryRole: AccountRole
  tenantId?: Id
}

export interface UpdateAccountInput {
  email?: string
  phone?: string
  primaryRole?: AccountRole
  preferences?: AccountPreferences
}

export interface UpdateAccountStatusInput {
  status: AccountStatus
  reason?: string
}
