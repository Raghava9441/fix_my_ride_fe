import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type { Notification, NotificationListFilters, NotificationStats } from '../types'

/**
 * Notification API service — all 8 endpoints under `/api/v1/notifications`.
 */

const BASE = '/notifications'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const notificationService = {
  list(filters: NotificationListFilters = {}, signal?: AbortSignal): Promise<Page<Notification>> {
    return fetchPage<Notification>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'notifications.list',
    })
  },

  unread(filters: NotificationListFilters = {}, signal?: AbortSignal): Promise<Page<Notification>> {
    return fetchPage<Notification>({
      url: `${BASE}/unread`,
      params: filters as QueryParams,
      signal,
      operation: 'notifications.unread',
    })
  },

  stats(signal?: AbortSignal): Promise<NotificationStats> {
    return api.get<NotificationStats>(`${BASE}/stats`, { signal, operation: 'notifications.stats' })
  },

  get(id: string, signal?: AbortSignal): Promise<Notification> {
    return api.get<Notification>(byId(id), { signal, operation: 'notifications.get' })
  },

  markRead(id: string): Promise<Notification> {
    return api.patch<Notification>(`${byId(id)}/read`, undefined, {
      operation: 'notifications.markRead',
    })
  },

  markClicked(id: string): Promise<Notification> {
    return api.patch<Notification>(`${byId(id)}/clicked`, undefined, {
      operation: 'notifications.markClicked',
    })
  },

  markAllRead(): Promise<{ modified: number }> {
    return api.post<{ modified: number }>(`${BASE}/read-all`, undefined, {
      operation: 'notifications.markAllRead',
    })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'notifications.delete' })
  },
} as const
