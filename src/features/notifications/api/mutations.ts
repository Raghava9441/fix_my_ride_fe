import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { notificationService } from './service'
import type { Notification } from '../types'

/**
 * Any read/dismiss action changes the unread count, so all of these
 * invalidate the whole notifications tree rather than a single list. The
 * collection is small and the badge being wrong is immediately visible.
 */
function invalidateAll(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation<Notification, ApiError, string, { previousStats?: unknown }>({
    mutationKey: ['notifications', 'mark-read'],
    mutationFn: (id) => notificationService.markRead(id),

    // Optimistic on the detail only. The badge count is derived server-side,
    // so it's left to the invalidation rather than decremented by hand —
    // guessing it here would fight the refetch and flicker.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.detail(id) })
      const previous = queryClient.getQueryData<Notification>(queryKeys.notifications.detail(id))
      if (previous) {
        queryClient.setQueryData<Notification>(queryKeys.notifications.detail(id), {
          ...previous,
          status: 'read',
          readAt: new Date().toISOString(),
        })
      }
      return {}
    },
    onSettled: () => invalidateAll(queryClient),
  })
}

export function useMarkNotificationClicked() {
  const queryClient = useQueryClient()

  return useMutation<Notification, ApiError, string>({
    mutationKey: ['notifications', 'mark-clicked'],
    mutationFn: (id) => notificationService.markClicked(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation<{ modified: number }, ApiError, void>({
    mutationKey: ['notifications', 'mark-all-read'],
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['notifications', 'delete'],
    mutationFn: (id) => notificationService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.detail(id) })
      invalidateAll(queryClient)
    },
  })
}
