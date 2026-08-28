import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Card } from './Card'

interface StatTileProps {
  label: string
  value: ReactNode
  sub?: string
  tone?: 'default' | 'critical'
}

export function StatTile({ label, value, sub, tone = 'default' }: StatTileProps) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{label}</div>
      <div
        className={clsx(
          'tabnum mt-1.5 font-mono text-2xl font-semibold',
          tone === 'critical' ? 'text-critical' : 'text-text',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-text-muted">{sub}</div>}
    </Card>
  )
}
