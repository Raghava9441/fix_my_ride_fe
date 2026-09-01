import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { queryKeys, type ApiError } from '@/lib/api'
import { reminderService } from './service'
import type { CreateReminderInput, Reminder, UpdateReminderInput } from '../types'

/**
 * Write hooks for reminders.
 *
 * Every lifecycle transition invalidates `reminders.all` rather than a
 * narrower key. That looks heavy-handed but is correct here: acknowledging a
 * reminder can move it out of `overdue`, out of `upcoming`, and — when
 * recurrence is enabled — cause the server to schedule a *new* occurrence
 * that no cached list knows about. Invalidating only the detail would leave
 * the counts beside it wrong.
 */
function invalidateAll(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.reminders.all })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()

  return useMutation<Reminder, ApiError, CreateReminderInput>({
    mutationKey: ['reminders', 'create'],
    mutationFn: (input) => reminderService.create(input),
    onSuccess: (reminder) => {
      invalidateAll(queryClient)
      // A vehicle-scoped reminder also shows on the vehicle's own tab.
      if (reminder.vehicleId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.reminders(reminder.vehicleId) })
      }
    },
  })
}

export function useUpdateReminder(id: string) {
  const queryClient = useQueryClient()

  return useMutation<Reminder, ApiError, UpdateReminderInput>({
    mutationKey: ['reminders', 'update', id],
    mutationFn: (input) => reminderService.update(id, input),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationKey: ['reminders', 'delete'],
    mutationFn: (id) => reminderService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.reminders.detail(id) })
      invalidateAll(queryClient)
    },
  })
}

export function useAcknowledgeReminder() {
  const queryClient = useQueryClient()

  return useMutation<Reminder, ApiError, string>({
    mutationKey: ['reminders', 'acknowledge'],
    mutationFn: (id) => reminderService.acknowledge(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useSnoozeReminder() {
  const queryClient = useQueryClient()

  return useMutation<Reminder, ApiError, { id: string; until: string }>({
    mutationKey: ['reminders', 'snooze'],
    mutationFn: ({ id, until }) => reminderService.snooze(id, until),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useCompleteReminder() {
  const queryClient = useQueryClient()

  return useMutation<Reminder, ApiError, string>({
    mutationKey: ['reminders', 'complete'],
    mutationFn: (id) => reminderService.complete(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useCancelReminder() {
  const queryClient = useQueryClient()

  return useMutation<Reminder, ApiError, string>({
    mutationKey: ['reminders', 'cancel'],
    mutationFn: (id) => reminderService.cancel(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useBulkAcknowledgeReminders() {
  const queryClient = useQueryClient()

  return useMutation<{ modified: number }, ApiError, string[]>({
    mutationKey: ['reminders', 'bulk-acknowledge'],
    mutationFn: (ids) => reminderService.bulkAcknowledge(ids),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useBulkCancelReminders() {
  const queryClient = useQueryClient()

  return useMutation<{ modified: number }, ApiError, string[]>({
    mutationKey: ['reminders', 'bulk-cancel'],
    mutationFn: (ids) => reminderService.bulkCancel(ids),
    onSuccess: () => invalidateAll(queryClient),
  })
}
