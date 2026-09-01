import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys, type QueryParams } from '@/lib/api'
import {
  invoiceService,
  paymentService,
  subscriptionPlanService,
  subscriptionService,
} from './service'
import type { InvoiceListFilters, PaymentListFilters } from '../types'

/* ---------------- invoices ---------------- */

export function useInvoices(filters: InvoiceListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: ({ signal }) => invoiceService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id ?? ''),
    queryFn: ({ signal }) => invoiceService.get(id!, signal),
    enabled: Boolean(id),
  })
}

/* ---------------- payments ---------------- */

export function usePayments(filters: PaymentListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.payments.list(filters),
    queryFn: ({ signal }) => paymentService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useMyPayments(filters: PaymentListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.payments.mine(filters),
    queryFn: ({ signal }) => paymentService.mine(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function usePaymentStats(filters: QueryParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.payments.stats(), filters] as const,
    queryFn: ({ signal }) => paymentService.stats(filters, signal),
    staleTime: 5 * 60_000,
  })
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id ?? ''),
    queryFn: ({ signal }) => paymentService.get(id!, signal),
    enabled: Boolean(id),
  })
}

/* ---------------- subscription ---------------- */

export function useMySubscription() {
  return useQuery({
    queryKey: queryKeys.subscriptions.mine(),
    queryFn: ({ signal }) => subscriptionService.mine(signal),
    staleTime: 5 * 60_000,
  })
}

/* ---------------- plans ----------------
 * Plans are a catalogue: they change on a release cadence, not a request
 * cadence, so they get a long freshness window and survive navigation.
 */

const CATALOGUE_STALE_TIME = 15 * 60_000

export function usePublicPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans.public(),
    queryFn: ({ signal }) => subscriptionPlanService.publicPlans(signal),
    staleTime: CATALOGUE_STALE_TIME,
  })
}

export function useSubscriptionPlans(filters: QueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans.list(filters),
    queryFn: ({ signal }) => subscriptionPlanService.list(filters, signal),
    staleTime: CATALOGUE_STALE_TIME,
  })
}

export function useComparePlans() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans.compare(),
    queryFn: ({ signal }) => subscriptionPlanService.compare(signal),
    staleTime: CATALOGUE_STALE_TIME,
  })
}

export function useSubscriptionPlan(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans.detail(id ?? ''),
    queryFn: ({ signal }) => subscriptionPlanService.get(id!, signal),
    enabled: Boolean(id),
    staleTime: CATALOGUE_STALE_TIME,
  })
}

export function useSubscriptionPlanBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans.bySlug(slug ?? ''),
    queryFn: ({ signal }) => subscriptionPlanService.getBySlug(slug!, signal),
    enabled: Boolean(slug),
    staleTime: CATALOGUE_STALE_TIME,
  })
}
