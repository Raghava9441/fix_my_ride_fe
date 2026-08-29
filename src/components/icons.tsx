import type { SVGProps } from 'react'

/**
 * The icon set.
 *
 * All drawn on a single 22×22 grid with one stroke weight and one join
 * style, so they sit together in a nav rail without one looking heavier
 * than its neighbours. `stroke="currentColor"` and no fixed size — colour
 * and size come from the call site's utilities, which keeps them
 * theme-aware for free.
 *
 * Adding one: keep to the 22-grid, 1.6 stroke, round caps, and leave ~2px
 * of optical padding so icons align with text at `h-4 w-4`.
 */

const base = {
  viewBox: '0 0 22 22',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

type IconProps = SVGProps<SVGSVGElement>

/* ---- brand ---- */

export function WrenchMark(props: IconProps) {
  return (
    <svg {...base} viewBox="0 0 20 20" {...props}>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2-2z" />
    </svg>
  )
}

/* ---- primary navigation ---- */

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="12" y="3" width="7" height="7" rx="1.2" />
      <rect x="3" y="12" width="7" height="7" rx="1.2" />
      <rect x="12" y="12" width="7" height="7" rx="1.2" />
    </svg>
  )
}

export function VehicleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15l.5-3.4Q5 9.5 7 9.5h8q2 0 2.5 2.1l.5 3.4" />
      <path d="M2.5 15h17v3H2.5z" />
      <circle cx="7" cy="18.5" r="1.4" />
      <circle cx="15" cy="18.5" r="1.4" />
    </svg>
  )
}

export function WrenchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15.4 7.1a3.8 3.8 0 01-5 5L4.7 17.8a1.9 1.9 0 002.7 2.7l5.7-5.7a3.8 3.8 0 015-5l-2.4 2.4-2.3-2.3z" />
    </svg>
  )
}

export function QueueIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 5.5h11M3 11h16M3 16.5h8" />
      <circle cx="18" cy="5.5" r="1.6" />
      <circle cx="14" cy="16.5" r="1.6" />
    </svg>
  )
}

export function ReminderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 2.5a1 1 0 011 1v.7A5.6 5.6 0 0117.5 9.7v3.3l1.3 2.6H3.2l1.3-2.6V9.7A5.6 5.6 0 0110 4.2v-.7a1 1 0 011-1z" />
      <path d="M8.7 17.8a2.3 2.3 0 004.6 0" />
    </svg>
  )
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 19V5.4a1 1 0 01.7-1l6-1.8a1 1 0 011.3 1V19" />
      <path d="M11.5 8.5h5.6a1 1 0 011 1V19" />
      <path d="M2 19h18" />
      <path d="M6 8h2.5M6 11.5h2.5M6 15h2.5M14 12h1.5M14 15.5h1.5" />
    </svg>
  )
}

export function StaffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 19c0-3 2.5-5.5 5.5-5.5S13.5 16 13.5 19" />
      <circle cx="16.5" cy="9" r="2.2" />
      <path d="M14.7 19c.3-2.4 1.9-4.3 4-4.9" />
    </svg>
  )
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="7.5" r="3.4" />
      <path d="M4 19c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
    </svg>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="17" height="12" rx="1.6" />
      <path d="M3 6.5l8 5.4 8-5.4" />
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 19h16" />
      <path d="M6 19v-5.5M10.3 19V7.5M14.7 19v-8.5M19 19V4.5" />
    </svg>
  )
}

export function InvoiceIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 2.8h9.5L18 6.3V19a1 1 0 01-1 1H5a1 1 0 01-1-1V3.8a1 1 0 011-1z" />
      <path d="M14 3v3.5h3.6" />
      <path d="M7 11h8M7 14.5h5" />
    </svg>
  )
}

export function CardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="17" height="12" rx="2" />
      <path d="M2.5 9.2h17" />
      <path d="M6 13.5h3" />
    </svg>
  )
}

export function PlanIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 2.6l2.5 5.2 5.7.8-4.1 4 1 5.7L11 15.6 5.9 18.3l1-5.7-4.1-4 5.7-.8z" />
    </svg>
  )
}

export function FolderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.8 6.2a1.4 1.4 0 011.4-1.4h4l2 2.4h7.6a1.4 1.4 0 011.4 1.4v8.6a1.4 1.4 0 01-1.4 1.4H4.2a1.4 1.4 0 01-1.4-1.4z" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="2.9" />
      <path d="M11 2.4l1 2.1 2.3-.5 1 2-1.6 1.7 1.6 1.7-1 2-2.3-.5-1 2.1-1-2.1-2.3.5-1-2 1.6-1.7L6.7 5.9l1-2 2.3.5z" />
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 2.6l7 2.6v5.2c0 4.2-2.8 7.7-7 9.1-4.2-1.4-7-4.9-7-9.1V5.2z" />
      <path d="M8 11l2.2 2.2L14.5 9" />
    </svg>
  )
}

export function KeyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="7" cy="7.5" r="4" />
      <path d="M9.9 10.4L19 19.5M16.2 16.7l1.8-1.8M13.4 13.9l1.8-1.8" />
    </svg>
  )
}

export function SlidersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h14M4 15.5h14" />
      <circle cx="9" cy="6.5" r="2.1" />
      <circle cx="14" cy="15.5" r="2.1" />
    </svg>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 5.5h12M7.5 11h12M7.5 16.5h12" />
      <path d="M3.2 5.5h.01M3.2 11h.01M3.2 16.5h.01" />
    </svg>
  )
}

export function BellIcon(props: IconProps) {
  return <ReminderIcon {...props} />
}

/* ---- controls ---- */

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.6" cy="9.6" r="5.6" />
      <path d="M13.8 13.8L19 19" />
    </svg>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6h15M3.5 11h15M3.5 16h15" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.5 5.5l11 11M16.5 5.5l-11 11" />
    </svg>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 4.5l6 6.5-6 6.5" />
    </svg>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 8.5l6.5 6 6.5-6" />
    </svg>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M13.5 4.5l-6 6.5 6 6.5" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 11.5l4.2 4.2L17.5 6.5" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 4.5v13M4.5 11h13" />
    </svg>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 3.5H5a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 005 18.5h3.5" />
      <path d="M13 7l4 4-4 4M17 11H8" />
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="9.5" width="13" height="9" rx="1.6" />
      <path d="M7.5 9.5V7a3.5 3.5 0 017 0v2.5" />
    </svg>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 3.2l8.2 14.2a1 1 0 01-.9 1.5H3.7a1 1 0 01-.9-1.5z" />
      <path d="M11 8.5v4M11 15.6h.01" />
    </svg>
  )
}

export function CompassIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M14.2 7.8l-1.7 4.7-4.7 1.7 1.7-4.7z" />
    </svg>
  )
}
