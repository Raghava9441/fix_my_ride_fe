import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'
import { useAuthStore } from '@/lib/auth/store'
import { Button } from '@/components/ui'
import { DashboardIcon, VehicleIcon, QueueIcon, ReminderIcon, StaffIcon, WrenchMark } from './icons'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, roles: null as string[] | null },
  { to: '/vehicles', label: 'Vehicles', icon: VehicleIcon, roles: null },
  { to: '/service-queue', label: 'Service queue', icon: QueueIcon, roles: ['admin', 'staff'] },
  { to: '/reminders', label: 'Reminders', icon: ReminderIcon, roles: null },
  { to: '/staff', label: 'Staff', icon: StaffIcon, roles: ['admin'] },
]

export function AppShell() {
  const { preferences } = usePreferences()
  const { user, logout } = useAuthStore()
  const isTopbar = preferences.nav === 'topbar'

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)))

  return (
    <div className={clsx('min-h-screen bg-surface-sunken', !isTopbar && 'md:flex')}>
      <nav
        className={clsx(
          'border-border bg-surface-raised',
          isTopbar
            ? 'flex items-center gap-1 border-b px-5 py-3'
            : 'flex w-full flex-row items-center gap-1 border-b p-3 md:w-52 md:flex-col md:items-stretch md:gap-1.5 md:border-b-0 md:border-r md:p-4',
        )}
      >
        <div className={clsx('flex items-center gap-2', isTopbar ? 'mr-4' : 'mb-5 hidden md:flex')}>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[calc(var(--radius-card)/1.6)] bg-accent text-accent-contrast">
            <WrenchMark className="h-4 w-4" />
          </span>
          <span className="font-display text-[15px]" style={{ fontWeight: 'var(--w-display)' }}>
            Fix My Ride
          </span>
        </div>

        <div className={clsx('flex flex-1 gap-1', isTopbar ? 'flex-row' : 'flex-row md:flex-col')}>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'interactive flex items-center gap-2 rounded-input px-2.5 py-2 text-sm font-semibold text-text-muted hover:bg-surface-sunken',
                  isActive && 'bg-accent-bg text-text hover:bg-accent-bg',
                )
              }
            >
              <item.icon className="h-4 w-4 flex-none" />
              <span className={isTopbar ? 'hidden lg:inline' : 'hidden md:inline'}>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className={clsx('flex items-center gap-1', isTopbar ? '' : 'md:mt-auto md:pt-4')}>
          <NavLink
            to="/settings"
            className="interactive rounded-input px-2.5 py-2 text-xs font-semibold text-text-muted hover:bg-surface-sunken hover:text-text"
          >
            Settings
          </NavLink>
          <Button variant="ghost" className="!px-2.5 !py-2 text-xs" onClick={logout}>
            Log out
          </Button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  )
}
