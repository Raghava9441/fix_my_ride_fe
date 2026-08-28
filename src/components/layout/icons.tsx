import type { SVGProps } from 'react'

const base = {
  viewBox: '0 0 22 22',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function WrenchMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} viewBox="0 0 20 20" {...props}>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2-2z" />
    </svg>
  )
}

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.2" />
      <rect x="12" y="3" width="7" height="7" rx="1.2" />
      <rect x="3" y="12" width="7" height="7" rx="1.2" />
      <rect x="12" y="12" width="7" height="7" rx="1.2" />
    </svg>
  )
}

export function VehicleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15l.5-3.4Q5 9.5 7 9.5h8q2 0 2.5 2.1l.5 3.4" />
      <path d="M2.5 15h17v3H2.5z" />
      <circle cx="7" cy="18.5" r="1.4" />
      <circle cx="15" cy="18.5" r="1.4" />
    </svg>
  )
}

export function QueueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.3 2.3-2-2z" />
    </svg>
  )
}

export function ReminderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M11 2.5a1 1 0 011 1v.7A5.6 5.6 0 0117.5 9.7v3.3l1.3 2.6H3.2l1.3-2.6V9.7A5.6 5.6 0 0110 4.2v-.7a1 1 0 011-1z" />
      <path d="M8.7 17.8a2.3 2.3 0 004.6 0" />
    </svg>
  )
}

export function StaffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M2.5 19c0-3 2.5-5.5 5.5-5.5S13.5 16 13.5 19" />
      <circle cx="16.5" cy="9" r="2.2" />
      <path d="M14.7 19c.3-2.4 1.9-4.3 4-4.9" />
    </svg>
  )
}
