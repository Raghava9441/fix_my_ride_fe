import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api'
import { reminderService } from './service'
import type { ReminderListFilters } from '../types'

export function useReminders(filters: ReminderListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reminders.list(filters),
    queryFn: ({ signal }) => reminderService.list(filters, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUpcomingReminders(filters: ReminderListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reminders.upcoming(filters),
    queryFn: ({ signal }) => reminderService.upcoming(filters, signal),
    // Due dates move as the clock does, so this is one of the few lists where
    // a shorter freshness window genuinely matters.
    staleTime: 60_000,
  })
}

export function useOverdueReminders(filters: ReminderListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reminders.overdue(filters),
    queryFn: ({ signal }) => reminderService.overdue(filters, signal),
    staleTime: 60_000,
  })
}

export function useReminder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reminders.detail(id ?? ''),
    queryFn: ({ signal }) => reminderService.get(id!, signal),
    enabled: Boolean(id),
  })
}
