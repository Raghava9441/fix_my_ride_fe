import { PlaceholderPage } from '@/features/system/PlaceholderPage'
import { PERMISSIONS } from '@/lib/access'

export default function RemindersPage() {
  return (
    <PlaceholderPage
      title="Reminders"
      description="Upcoming and overdue service reminders, with bulk acknowledge and snooze."
      endpoints={[
        'GET  /api/v1/reminders/upcoming',
        'GET  /api/v1/reminders/overdue',
        'POST /api/v1/reminders/:id/acknowledge',
        'POST /api/v1/reminders/:id/snooze',
        'POST /api/v1/reminders/bulk/acknowledge',
      ]}
      permissions={[PERMISSIONS.reminder.read, PERMISSIONS.reminder.manage]}
    />
  )
}
