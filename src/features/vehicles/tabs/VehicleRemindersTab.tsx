import { useOutletContext } from 'react-router-dom'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, useToast } from '@/components/ui'
import { ReminderIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import {
  useAcknowledgeReminder,
  useCompleteReminder,
  useSnoozeReminder,
} from '@/features/reminders/api'
import type { Reminder, ReminderPriority, ReminderStatus } from '@/features/reminders/types'
import type { Tone } from '@/components/ui'
import { useVehicleReminders } from '../api'
import type { VehicleOutletContext } from '../VehicleDetailPage'

const PRIORITY_TONE: Record<ReminderPriority, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'critical',
}

const STATUS_TONE: Record<ReminderStatus, Tone> = {
  pending: 'neutral',
  acknowledged: 'info',
  snoozed: 'warning',
  completed: 'success',
  cancelled: 'neutral',
}

/** Days until due, negative once overdue. */
function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function dueLabel(reminder: Reminder): { text: string; tone: Tone } {
  const days = daysUntil(reminder.dueDate)
  const date = new Date(reminder.dueDate).toLocaleDateString()

  if (reminder.status === 'completed') return { text: `Completed · ${date}`, tone: 'success' }
  if (reminder.status === 'cancelled') return { text: `Cancelled · ${date}`, tone: 'neutral' }

  // "3 days overdue" is immediately actionable in a way a bare date isn't.
  if (days < 0) return { text: `${Math.abs(days)} days overdue · ${date}`, tone: 'critical' }
  if (days === 0) return { text: `Due today · ${date}`, tone: 'warning' }
  if (days <= 7) return { text: `Due in ${days} days · ${date}`, tone: 'warning' }
  return { text: `Due ${date}`, tone: 'neutral' }
}

export default function VehicleRemindersTab() {
  const { vehicleId } = useOutletContext<VehicleOutletContext>()
  const toast = useToast()

  const reminders = useVehicleReminders(vehicleId)
  const acknowledge = useAcknowledgeReminder()
  const complete = useCompleteReminder()
  const snooze = useSnoozeReminder()

  const apiError = asApiError(reminders.error)
  const items = reminders.data ?? []

  // Overdue first, then by due date. A reminders list ordered by creation is
  // useless — the whole point is what needs attention soonest.
  const sorted = [...items].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  )

  const overdue = sorted.filter(
    (r) => daysUntil(r.dueDate) < 0 && r.status !== 'completed' && r.status !== 'cancelled',
  ).length

  const busy = acknowledge.isPending || complete.isPending || snooze.isPending

  return (
    <Card>
      <CardHeader
        title="Reminders"
        description="Scheduled service, insurance, and renewal reminders."
        actions={
          overdue > 0 ? <Badge tone="critical">{overdue} overdue</Badge> : undefined
        }
      />

      <CardBody className="p-0">
        {reminders.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 rounded-input" />
            ))}
          </div>
        ) : reminders.isError ? (
          <div className="p-4">
            <p className="text-sm text-critical">
              {apiError?.userMessage ?? 'Couldn’t load reminders.'}
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={ReminderIcon}
            title="No reminders"
            description="Reminders are created automatically when a service records a next-service date."
          />
        ) : (
          <ul>
            {sorted.map((reminder) => {
              const due = dueLabel(reminder)
              const open = reminder.status !== 'completed' && reminder.status !== 'cancelled'

              return (
                <li
                  key={reminder._id}
                  className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">{reminder.title}</span>
                      <Badge tone={PRIORITY_TONE[reminder.priority]}>{reminder.priority}</Badge>
                      <Badge tone={STATUS_TONE[reminder.status]}>{reminder.status}</Badge>
                    </div>
                    <div
                      className={
                        due.tone === 'critical'
                          ? 'mt-0.5 text-xs font-semibold text-critical'
                          : 'mt-0.5 text-xs text-text-muted'
                      }
                    >
                      {due.text}
                    </div>
                    {reminder.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                        {reminder.description}
                      </p>
                    )}
                  </div>

                  {open && (
                    <Can rule={access.permission(PERMISSIONS.reminder.read)}>
                      <div className="flex flex-none flex-wrap gap-2">
                        {reminder.status !== 'acknowledged' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              acknowledge.mutate(reminder._id, {
                                onSuccess: () => toast.success('Reminder acknowledged'),
                                onError: (e) => toast.error('Couldn’t acknowledge', e.userMessage),
                              })
                            }
                          >
                            Acknowledge
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            // A week is the sensible default for a service
                            // reminder; a date picker here would be four extra
                            // clicks for the case that's almost always wanted.
                            const until = new Date()
                            until.setDate(until.getDate() + 7)
                            snooze.mutate(
                              { id: reminder._id, until: until.toISOString() },
                              {
                                onSuccess: () => toast.success('Snoozed for a week'),
                                onError: (e) => toast.error('Couldn’t snooze', e.userMessage),
                              },
                            )
                          }}
                        >
                          Snooze 7d
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            complete.mutate(reminder._id, {
                              onSuccess: () => toast.success('Reminder completed'),
                              onError: (e) => toast.error('Couldn’t complete', e.userMessage),
                            })
                          }
                        >
                          Complete
                        </Button>
                      </div>
                    </Can>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}
