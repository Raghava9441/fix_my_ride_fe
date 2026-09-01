import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { invoiceService, subscriptionPlanService, subscriptionService } from './service'
import type {
  CancelSubscriptionInput,
  CreateInvoiceInput,
  CreatePlanInput,
  Invoice,
  PayInvoiceInput,
  SubscribeInput,
  Subscription,
  SubscriptionPlan,
  UpdatePlanInput,
} from '../types'

/**
 * Billing writes.
 *
 * Nothing here is optimistic. Money is the one place where showing a result
 * before the server has confirmed it is actively harmful: an optimistic
 * "paid" that later rolls back is worse than a spinner, and a failed payment
 * that briefly rendered as successful will generate a support ticket every
 * time.
 */

function invalidateInvoice(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(id) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation<Invoice, ApiError, CreateInvoiceInput>({
    mutationKey: ['invoices', 'create'],
    mutationFn: (input) => invoiceService.create(input),
    onSuccess: (invoice) => {
      queryClient.setQueryData(queryKeys.invoices.detail(invoice._id), invoice)
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() })
    },
  })
}

export function usePayInvoice(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Invoice, ApiError, PayInvoiceInput>({
    mutationKey: ['invoices', 'pay', id],
    mutationFn: (input) => invoiceService.pay(id, input),
    onSuccess: () => {
      invalidateInvoice(queryClient, id)
      // A payment record now exists, and the totals on the stats tile moved.
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
    },
  })
}

export function useSendInvoice() {
  const queryClient = useQueryClient()

  return useMutation<Invoice, ApiError, string>({
    mutationKey: ['invoices', 'send'],
    mutationFn: (id) => invoiceService.send(id),
    onSuccess: (_data, id) => invalidateInvoice(queryClient, id),
  })
}

export function useVoidInvoice() {
  const queryClient = useQueryClient()

  return useMutation<Invoice, ApiError, { id: string; reason?: string }>({
    mutationKey: ['invoices', 'void'],
    mutationFn: ({ id, reason }) => invoiceService.void(id, reason),
    onSuccess: (_data, { id }) => invalidateInvoice(queryClient, id),
  })
}

/* ---------------- subscription ---------------- */

export function useSubscribe() {
  const queryClient = useQueryClient()

  return useMutation<Subscription, ApiError, SubscribeInput>({
    mutationKey: ['subscriptions', 'subscribe'],
    mutationFn: (input) => subscriptionService.subscribe(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all })

      /*
       * A plan change moves the tenant's feature set and limits, and the
       * permission catalogue gates some permissions on `requiredPlan`. Both
       * the tenant document and the session's capabilities can change, so
       * refresh them rather than leaving the UI on the old plan's rules.
       */
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenant.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.session.all })
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation<Subscription, ApiError, { id: string; input?: CancelSubscriptionInput }>({
    mutationKey: ['subscriptions', 'cancel'],
    mutationFn: ({ id, input }) => subscriptionService.cancel(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenant.all })
    },
  })
}

/* ---------------- plans (admin) ---------------- */

function invalidatePlans(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionPlans.all })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation<SubscriptionPlan, ApiError, CreatePlanInput>({
    mutationKey: ['plans', 'create'],
    mutationFn: (input) => subscriptionPlanService.create(input),
    onSuccess: () => invalidatePlans(queryClient),
  })
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient()

  return useMutation<SubscriptionPlan, ApiError, UpdatePlanInput>({
    mutationKey: ['plans', 'update', id],
    mutationFn: (input) => subscriptionPlanService.update(id, input),
    onSuccess: () => invalidatePlans(queryClient),
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['plans', 'delete'],
    mutationFn: (id) => subscriptionPlanService.remove(id),
    onSuccess: () => invalidatePlans(queryClient),
  })
}
