import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { notificationService } from './service'
import type { NotificationListFilters } from '../types'

export function useNotifications(filters: NotificationListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: ({ signal }) => notificationService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUnreadNotifications(filters: NotificationListFilters = {}) {
  return useQuery({
    queryKey: [...queryKeys.notifications.unread(), filters] as const,
    queryFn: ({ signal }) => notificationService.unread(filters, signal),
  })
}

/**
 * Drives the unread badge in the top bar, so it's mounted on every screen.
 *
 * Polls on an interval rather than relying on refetch-on-focus alone: the
 * badge is the one piece of state a user expects to update while they sit on
 * a page. Sixty seconds is a deliberate compromise — frequent enough to feel
 * live, infrequent enough that a full workshop floor isn't hammering the API.
 * `refetchIntervalInBackground` stays off so a hidden tab costs nothing.
 */
export function useNotificationStats() {
  return useQuery({
    queryKey: queryKeys.notifications.stats(),
    queryFn: ({ signal }) => notificationService.stats(signal),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  })
}

export function useNotification(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notifications.detail(id ?? ''),
    queryFn: ({ signal }) => notificationService.get(id!, signal),
    enabled: Boolean(id),
  })
}
