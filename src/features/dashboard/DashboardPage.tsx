import { useAuthStore } from '@/lib/auth/store'
import { StatTile } from '@/components/ui'
import { useVehicles } from '@/features/vehicles/api'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data: vehicles, isLoading } = useVehicles()

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl">Welcome back{user ? `, ${user.email.split('@')[0]}` : ''}</h1>
        <p className="mt-1 text-sm text-text-muted">Here's what's happening in your shop today.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Vehicles on record" value={isLoading ? '—' : (vehicles?.length ?? 0)} />
        <StatTile label="Overdue services" value={0} sub="needs attention" tone="critical" />
        <StatTile label="Signed in as" value={user?.role ?? '—'} sub={user?.email} />
      </div>
    </div>
  )
}
