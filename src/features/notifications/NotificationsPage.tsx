import { PlaceholderPage } from '@/features/system/PlaceholderPage'

export default function NotificationsPage() {
  return (
    <PlaceholderPage
      title="Notifications"
      description="Everything the system has sent you, read and unread."
      endpoints={[
        'GET   /api/v1/notifications',
        'GET   /api/v1/notifications/unread',
        'POST  /api/v1/notifications/read-all',
        'PATCH /api/v1/notifications/:id/read',
      ]}
    />
  )
}
