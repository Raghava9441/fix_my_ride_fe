import { api, fetchPage, type Page, type QueryParams } from '@/lib/api'
import type {
  CreateReminderInput,
  Reminder,
  ReminderListFilters,
  UpdateReminderInput,
} from '../types'

/**
 * Reminder API service — all 13 endpoints under `/api/v1/reminders`.
 *
 * The lifecycle transitions (acknowledge, snooze, complete, cancel) are
 * separate POSTs rather than a status PATCH, matching the backend's model
 * methods. They're modelled that way here too: each transition has its own
 * server-side side effects (scheduling the next occurrence, stamping
 * `acknowledgedAt`) that a generic status write wouldn't trigger.
 */

const BASE = '/reminders'
const byId = (id: string) => `${BASE}/${encodeURIComponent(id)}`

export const reminderService = {
  list(filters: ReminderListFilters = {}, signal?: AbortSignal): Promise<Page<Reminder>> {
    return fetchPage<Reminder>({
      url: BASE,
      params: filters as QueryParams,
      signal,
      operation: 'reminders.list',
    })
  },

  upcoming(filters: ReminderListFilters = {}, signal?: AbortSignal): Promise<Page<Reminder>> {
    return fetchPage<Reminder>({
      url: `${BASE}/upcoming`,
      params: filters as QueryParams,
      signal,
      operation: 'reminders.upcoming',
    })
  },

  overdue(filters: ReminderListFilters = {}, signal?: AbortSignal): Promise<Page<Reminder>> {
    return fetchPage<Reminder>({
      url: `${BASE}/overdue`,
      params: filters as QueryParams,
      signal,
      operation: 'reminders.overdue',
    })
  },

  get(id: string, signal?: AbortSignal): Promise<Reminder> {
    return api.get<Reminder>(byId(id), { signal, operation: 'reminders.get' })
  },

  create(input: CreateReminderInput): Promise<Reminder> {
    return api.post<Reminder>(BASE, input, { operation: 'reminders.create' })
  },

  update(id: string, input: UpdateReminderInput): Promise<Reminder> {
    return api.put<Reminder>(byId(id), input, { operation: 'reminders.update' })
  },

  remove(id: string): Promise<void> {
    return api.delete<void>(byId(id), { operation: 'reminders.delete' })
  },

  /* ---------------- lifecycle ---------------- */

  acknowledge(id: string): Promise<Reminder> {
    return api.post<Reminder>(`${byId(id)}/acknowledge`, undefined, {
      operation: 'reminders.acknowledge',
    })
  },

  snooze(id: string, until: string): Promise<Reminder> {
    return api.post<Reminder>(`${byId(id)}/snooze`, { until }, { operation: 'reminders.snooze' })
  },

  complete(id: string): Promise<Reminder> {
    return api.post<Reminder>(`${byId(id)}/complete`, undefined, { operation: 'reminders.complete' })
  },

  cancel(id: string): Promise<Reminder> {
    return api.post<Reminder>(`${byId(id)}/cancel`, undefined, { operation: 'reminders.cancel' })
  },

  /* ---------------- bulk ----------------
   * Bulk endpoints take the ids in the body rather than the query string,
   * which keeps a hundred-id selection off the URL and out of access logs.
   */

  bulkAcknowledge(ids: string[]): Promise<{ modified: number }> {
    return api.post<{ modified: number }>(`${BASE}/bulk/acknowledge`, { ids }, {
      operation: 'reminders.bulkAcknowledge',
    })
  },

  bulkCancel(ids: string[]): Promise<{ modified: number }> {
    return api.post<{ modified: number }>(`${BASE}/bulk/cancel`, { ids }, {
      operation: 'reminders.bulkCancel',
    })
  },
} as const
