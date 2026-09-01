import type { BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app'

export type NotificationStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'read'
  | 'clicked'
  | 'cancelled'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification extends BaseDocument {
  tenantId?: Id
  recipientId: Id
  recipientModel: 'Account' | 'ServiceCenter'
  title: string
  content: string
  channel: NotificationChannel
  /** Free-form on the server — e.g. `service_due`, `invoice_issued`. */
  type: string
  data?: Record<string, unknown>
  status: NotificationStatus
  sentAt?: IsoDate
  deliveredAt?: IsoDate
  readAt?: IsoDate
  clickedAt?: IsoDate
  priority: NotificationPriority
  expiresAt?: IsoDate
  isBulk?: boolean
}

export interface NotificationListFilters extends ListParams {
  channel?: NotificationChannel
  status?: NotificationStatus
  type?: string
  priority?: NotificationPriority
  [key: string]: string | number | boolean | undefined
}

export interface NotificationStats {
  total?: number
  unread?: number
  byChannel?: Record<string, number>
  [key: string]: unknown
}
