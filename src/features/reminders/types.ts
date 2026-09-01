import type { BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'

export type ReminderType = 'service' | 'insurance' | 'tax' | 'registration' | 'custom'
export type ReminderPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ReminderStatus = 'pending' | 'acknowledged' | 'snoozed' | 'completed' | 'cancelled'

export interface ReminderRecurrence {
  enabled: boolean
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  endDate?: IsoDate
  occurrences?: number
}

export interface ReminderNotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  /** Days before `dueDate` to start notifying. */
  reminderLeadTime: number
}

export interface Reminder extends BaseDocument {
  tenantId?: Id
  vehicleId?: Id
  serviceRecordId?: Id
  ownerId?: Id
  staffId?: Id
  type: ReminderType
  title: string
  description?: string
  dueDate: IsoDate
  priority: ReminderPriority
  recurrence?: ReminderRecurrence
  notificationPreferences?: ReminderNotificationPreferences
  status: ReminderStatus
  acknowledgedAt?: IsoDate
  snoozedUntil?: IsoDate
  completedAt?: IsoDate
  cancelledAt?: IsoDate
  lastNotifiedAt?: IsoDate
  notificationCount?: number
  createdBy?: Id
}

export interface ReminderListFilters extends ListParams {
  vehicleId?: Id
  ownerId?: Id
  type?: ReminderType
  status?: ReminderStatus
  priority?: ReminderPriority
  from?: IsoDate
  to?: IsoDate
  [key: string]: string | number | boolean | undefined
}

export interface CreateReminderInput {
  vehicleId?: Id
  serviceRecordId?: Id
  type: ReminderType
  title: string
  description?: string
  dueDate: IsoDate
  priority?: ReminderPriority
  recurrence?: Partial<ReminderRecurrence>
  notificationPreferences?: Partial<ReminderNotificationPreferences>
}

export type UpdateReminderInput = Partial<CreateReminderInput>

export interface SnoozeReminderInput {
  /** ISO timestamp to snooze until. */
  until: IsoDate
}
