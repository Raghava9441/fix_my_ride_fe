import { Link, useNavigate } from 'react-router-dom'
import {
  BellIcon,
  LogoutIcon,
  MenuIcon,
  PersonIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  WrenchMark,
} from '@/components/icons'
import { Avatar, Button, Kbd, Menu, MenuItem, MenuLabel, MenuSeparator, modifierKeyLabel } from '@/components/ui'
import { useAccess } from '@/lib/access'
import { useAuthStore } from '@/lib/auth/store'
import { useFlag } from '@/lib/flags/FlagsProvider'
import { ACCOUNT_ROLE_LABELS } from '@/lib/access/roles'
import { ROUTE_PATHS } from '@/lib/routing'
import { TopNav } from './SideNav'

interface TopBarProps {
  onOpenDrawer: () => void
  onOpenCommandPalette: () => void
  showInlineNav: boolean
}

export function TopBar({ onOpenDrawer, onOpenCommandPalette, showInlineNav }: TopBarProps) {
  const { session } = useAccess()
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const paletteEnabled = useFlag('commandPalette')
  const notificationsEnabled = useFlag('notifications')

  const displayName = session?.name || session?.email || 'Account'

  return (
    <header
      className="sticky top-0 flex h-topbar flex-none items-center gap-2 border-b border-border bg-surface-raised px-3"
      style={{ zIndex: 'var(--z-topbar)' }}
    >
      <Button
        variant="ghost"
        iconOnly
        size="sm"
        className="md:hidden"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
      >
        <MenuIcon className="h-4 w-4" />
      </Button>

      <Link to={ROUTE_PATHS.dashboard} className="interactive flex flex-none items-center gap-2 rounded-input px-1 py-1">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[calc(var(--radius-card)/1.6)] bg-accent text-accent-contrast">
          <WrenchMark className="h-4 w-4" />
        </span>
        <span className="hidden font-display text-[15px] sm:inline" style={{ fontWeight: 'var(--w-display)' }}>
          Fix My Ride
        </span>
      </Link>

      {showInlineNav ? <TopNav /> : <div className="flex-1" />}

      {paletteEnabled && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="interactive hidden items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-faint hover:border-border-strong hover:text-text-muted sm:flex"
        >
          <SearchIcon className="h-3.5 w-3.5" />
          <span>Jump to…</span>
          <Kbd className="ml-2">{modifierKeyLabel} K</Kbd>
        </button>
      )}

      {notificationsEnabled && (
        <Button asChild variant="ghost" iconOnly size="sm">
          <Link to={ROUTE_PATHS.notifications} aria-label="Notifications">
            <BellIcon className="h-4 w-4" />
          </Link>
        </Button>
      )}

      <Menu
        trigger={
          <button
            type="button"
            className="interactive flex items-center gap-2 rounded-pill p-0.5 pr-1 hover:bg-surface-sunken"
            aria-label="Account menu"
          >
            <Avatar name={displayName} size="md" />
          </button>
        }
      >
        <MenuLabel>{displayName}</MenuLabel>
        {session && (
          <div className="px-2.5 pb-2 text-xs text-text-muted">
            {ACCOUNT_ROLE_LABELS[session.primaryRole]}
            {session.tenantId ? ' · workspace' : ' · platform'}
          </div>
        )}
        <MenuSeparator />

        <MenuItem asChild>
          <Link to={ROUTE_PATHS.profile}>
            <PersonIcon className="h-4 w-4 flex-none text-text-faint" />
            Your profile
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link to={ROUTE_PATHS.security}>
            <ShieldIcon className="h-4 w-4 flex-none text-text-faint" />
            Security
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link to={ROUTE_PATHS.appearance}>
            <SettingsIcon className="h-4 w-4 flex-none text-text-faint" />
            Appearance
          </Link>
        </MenuItem>

        <MenuSeparator />
        <MenuItem
          danger
          onSelect={() => {
            void logout().then(() => navigate(ROUTE_PATHS.login, { replace: true }))
          }}
        >
          <LogoutIcon className="h-4 w-4 flex-none" />
          Sign out
        </MenuItem>
      </Menu>
    </header>
  )
}
