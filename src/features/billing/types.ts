import type { Address, BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'

/* ---------------- invoices ---------------- */

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'void'
  | 'cancelled'

export interface InvoiceLineItem {
  _id?: Id
  description?: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice extends BaseDocument {
  tenantId?: Id
  invoiceNumber: string
  accountId: Id
  serviceCenterId?: Id
  serviceRecordIds?: Id[]
  lineItems?: InvoiceLineItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  amountPaid: number
  amountDue: number
  currency: string
  status: InvoiceStatus
  issueDate: IsoDate
  dueDate: IsoDate
  paidAt?: IsoDate
  voidedAt?: IsoDate
  voidReason?: string
  notes?: string
  billingEmail?: string
  billingName?: string
  billingAddress?: Address
}

export interface InvoiceListFilters extends ListParams {
  status?: InvoiceStatus
  accountId?: Id
  serviceCenterId?: Id
  from?: IsoDate
  to?: IsoDate
  [key: string]: string | number | boolean | undefined
}

export interface CreateInvoiceInput {
  accountId: Id
  serviceCenterId?: Id
  serviceRecordIds?: Id[]
  lineItems: InvoiceLineItem[]
  dueDate: IsoDate
  notes?: string
  currency?: string
}

export interface PayInvoiceInput {
  amount?: number
  provider?: PaymentProvider
  providerPaymentId?: string
}

/* ---------------- payments ---------------- */

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'disputed' | 'cancelled'
export type PaymentProvider = 'stripe' | 'paypal' | 'razorpay' | 'bank_transfer' | 'cash'
export type PaymentType = 'subscription' | 'invoice' | 'one_time' | 'refund'

export interface Payment extends BaseDocument {
  accountId: Id
  serviceCenterId?: Id
  tenantId?: Id
  type: PaymentType
  status: PaymentStatus
  amount: number
  currency: string
  taxAmount: number
  discountAmount: number
  totalAmount: number
  provider: PaymentProvider
  providerPaymentId?: string
  invoiceId?: Id
  subscriptionId?: Id
  description?: string
  billingEmail: string
  billingName?: string
  billingAddress?: Address
  refundAmount?: number
  refundReason?: string
  refundAt?: IsoDate
  paidAt?: IsoDate
  failedAt?: IsoDate
  failureReason?: string
}

export interface PaymentListFilters extends ListParams {
  status?: PaymentStatus
  provider?: PaymentProvider
  type?: PaymentType
  from?: IsoDate
  to?: IsoDate
  [key: string]: string | number | boolean | undefined
}

export interface PaymentStats {
  total?: number
  completed?: number
  failed?: number
  refunded?: number
  totalAmount?: number
  currency?: string
  [key: string]: unknown
}

/* ---------------- subscriptions ---------------- */

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired'

export interface Subscription extends BaseDocument {
  tenantId?: Id
  serviceCenterId?: Id
  planId: Id
  status: SubscriptionStatus
  billingInterval: 'month' | 'year'
  currentPeriodStart: IsoDate
  currentPeriodEnd: IsoDate
  trialEndsAt?: IsoDate
  cancelAtPeriodEnd: boolean
  cancelledAt?: IsoDate
  cancelReason?: string
  provider: 'stripe' | 'paypal' | 'razorpay' | 'manual'
  quantity: number
  autoRenew: boolean
}

export interface SubscribeInput {
  planId: Id
  billingInterval?: 'month' | 'year'
  quantity?: number
}

export interface CancelSubscriptionInput {
  reason?: string
  /** Cancel now rather than at the end of the paid period. */
  immediate?: boolean
}

/* ---------------- plans ---------------- */

export interface PlanLimits {
  maxVehicles: number
  maxStaff: number
  maxServiceCenters: number
  maxStorageGB: number
  maxApiCallsPerMonth: number
  includedRemindersPerMonth: number
  customFeatures?: string[]
}

export interface PlanFeature {
  name: string
  description?: string
  included: boolean
  limit?: number
}

export interface SubscriptionPlan extends BaseDocument {
  name: string
  slug: string
  description?: string
  type: 'free' | 'basic' | 'professional' | 'enterprise' | 'custom'
  price: number
  currency: string
  billingInterval: 'month' | 'year'
  trialDays: number
  limits: PlanLimits
  features?: PlanFeature[]
  isActive: boolean
  isPublic: boolean
  displayOrder: number
}

export interface CreatePlanInput {
  name: string
  slug?: string
  description?: string
  type: SubscriptionPlan['type']
  price: number
  currency?: string
  billingInterval: 'month' | 'year'
  trialDays?: number
  limits: PlanLimits
  features?: PlanFeature[]
  isPublic?: boolean
}

export type UpdatePlanInput = Partial<CreatePlanInput> & { isActive?: boolean }
