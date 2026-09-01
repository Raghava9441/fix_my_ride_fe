import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type {
  CancelSubscriptionInput,
  CreateInvoiceInput,
  CreatePlanInput,
  Invoice,
  InvoiceListFilters,
  PayInvoiceInput,
  Payment,
  PaymentListFilters,
  PaymentStats,
  SubscribeInput,
  Subscription,
  SubscriptionPlan,
  UpdatePlanInput,
} from '../types'

/**
 * Billing API services — 21 endpoints across four backend routers:
 * `/invoices` (6), `/payments` (4), `/subscriptions` (3), and
 * `/subscription-plans` (8).
 *
 * Grouped into one feature because they're one user-facing concern: a plan
 * produces a subscription, a subscription and a service record produce
 * invoices, and an invoice produces a payment. Splitting them across four
 * features would put every billing screen in the position of importing from
 * four places to render one page.
 */

const INVOICES = '/invoices'
const PAYMENTS = '/payments'
const SUBSCRIPTIONS = '/subscriptions'
const PLANS = '/subscription-plans'

export const invoiceService = {
  list(filters: InvoiceListFilters = {}, signal?: AbortSignal): Promise<Page<Invoice>> {
    return fetchPage<Invoice>({
      url: INVOICES,
      params: filters as QueryParams,
      signal,
      operation: 'invoices.list',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Invoice> {
    return api.get<Invoice>(`${INVOICES}/${encodeURIComponent(id)}`, {
      signal,
      operation: 'invoices.get',
    })
  },

  create(input: CreateInvoiceInput): Promise<Invoice> {
    return api.post<Invoice>(INVOICES, input, { operation: 'invoices.create' })
  },

  /**
   * Records a payment against an invoice.
   *
   * Never retried — the transport refuses to retry a POST automatically, and
   * this is the clearest case for why: a timeout here could mean the payment
   * was captured, and a silent retry would take the money twice.
   */
  pay(id: string, input: PayInvoiceInput): Promise<Invoice> {
    return api.post<Invoice>(`${INVOICES}/${encodeURIComponent(id)}/pay`, input, {
      operation: 'invoices.pay',
    })
  },

  send(id: string): Promise<Invoice> {
    return api.post<Invoice>(`${INVOICES}/${encodeURIComponent(id)}/send`, undefined, {
      operation: 'invoices.send',
    })
  },

  void(id: string, reason?: string): Promise<Invoice> {
    return api.post<Invoice>(`${INVOICES}/${encodeURIComponent(id)}/void`, { reason }, {
      operation: 'invoices.void',
    })
  },
} as const

export const paymentService = {
  /** All payments across the platform. Admin-only on the backend. */
  list(filters: PaymentListFilters = {}, signal?: AbortSignal): Promise<Page<Payment>> {
    return fetchPage<Payment>({
      url: PAYMENTS,
      params: filters as QueryParams,
      signal,
      operation: 'payments.list',
    })
  },

  /** The signed-in account's own payments. */
  mine(filters: PaymentListFilters = {}, signal?: AbortSignal): Promise<Page<Payment>> {
    return fetchPage<Payment>({
      url: `${PAYMENTS}/mine`,
      params: filters as QueryParams,
      signal,
      operation: 'payments.mine',
    })
  },

  stats(filters: QueryParams = {}, signal?: AbortSignal): Promise<PaymentStats> {
    return api.get<PaymentStats>(`${PAYMENTS}/stats`, {
      params: filters,
      signal,
      operation: 'payments.stats',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Payment> {
    return api.get<Payment>(`${PAYMENTS}/${encodeURIComponent(id)}`, {
      signal,
      operation: 'payments.get',
    })
  },
} as const

export const subscriptionService = {
  mine(signal?: AbortSignal): Promise<Subscription> {
    return api.get<Subscription>(`${SUBSCRIPTIONS}/me`, {
      signal,
      operation: 'subscriptions.mine',
    })
  },

  subscribe(input: SubscribeInput): Promise<Subscription> {
    return api.post<Subscription>(`${SUBSCRIPTIONS}/subscribe`, input, {
      operation: 'subscriptions.subscribe',
    })
  },

  cancel(id: string, input: CancelSubscriptionInput = {}): Promise<Subscription> {
    return api.post<Subscription>(`${SUBSCRIPTIONS}/${encodeURIComponent(id)}/cancel`, input, {
      operation: 'subscriptions.cancel',
    })
  },
} as const

export const subscriptionPlanService = {
  /**
   * Public pricing. `anonymous: true` because this is rendered on the
   * marketing page before any session exists — sending a stale bearer token
   * would trigger a pointless refresh attempt.
   */
  publicPlans(signal?: AbortSignal): Promise<SubscriptionPlan[]> {
    return api.get<SubscriptionPlan[]>(`${PLANS}/public`, {
      anonymous: true,
      signal,
      operation: 'plans.public',
    })
  },

  list(filters: QueryParams = {}, signal?: AbortSignal): Promise<Page<SubscriptionPlan>> {
    return fetchPage<SubscriptionPlan>({
      url: PLANS,
      params: filters,
      signal,
      operation: 'plans.list',
    })
  },

  compare(signal?: AbortSignal): Promise<SubscriptionPlan[]> {
    return api.get<SubscriptionPlan[]>(`${PLANS}/compare`, { signal, operation: 'plans.compare' })
  },

  getBySlug(slug: string, signal?: AbortSignal): Promise<SubscriptionPlan> {
    return api.get<SubscriptionPlan>(`${PLANS}/slug/${encodeURIComponent(slug)}`, {
      signal,
      operation: 'plans.getBySlug',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<SubscriptionPlan> {
    return api.get<SubscriptionPlan>(`${PLANS}/${encodeURIComponent(id)}`, {
      signal,
      operation: 'plans.get',
    })
  },

  create(input: CreatePlanInput): Promise<SubscriptionPlan> {
    return api.post<SubscriptionPlan>(PLANS, input, { operation: 'plans.create' })
  },

  update(id: string, input: UpdatePlanInput): Promise<SubscriptionPlan> {
    return api.put<SubscriptionPlan>(`${PLANS}/${encodeURIComponent(id)}`, input, {
      operation: 'plans.update',
    })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(`${PLANS}/${encodeURIComponent(id)}`, { operation: 'plans.delete' })
  },
} as const
