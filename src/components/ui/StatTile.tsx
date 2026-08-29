import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Card } from './Card'

interface StatTileProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'critical'
  loading?: boolean
}

const toneClass = {
  default: 'text-text',
  success: 'text-success',
  warning: 'text-warning',
  critical: 'text-critical',
} as const

export function StatTile({ label, value, sub, tone = 'default', loading }: StatTileProps) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{label}</div>
      {loading ? (
        <div className="skeleton mt-2 h-7 w-20" />
      ) : (
        // Mono + tabular so a column of these lines up digit-for-digit.
        <div className={clsx('tabnum mt-1.5 font-mono text-2xl font-semibold', toneClass[tone])}>{value}</div>
      )}
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </Card>
  )
}
