import clsx from 'clsx'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'
import { PREFERENCE_OPTIONS, type Preferences } from '@/lib/preferences/types'
import { Button, Card, CardBody, CardHeader } from '@/components/ui'

function Segmented<K extends keyof Preferences>({
  axis,
  title,
}: {
  axis: K
  title: string
}) {
  const { preferences, setPreference } = usePreferences()
  const options = PREFERENCE_OPTIONS[axis] as { value: Preferences[K]; label: string; sample?: string }[]

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-text-faint">{title}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = preferences[axis] === opt.value
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setPreference(axis, opt.value)}
              className={clsx(
                'interactive rounded-pill border px-3 py-1.5 text-left text-xs font-semibold',
                active
                  ? 'border-accent bg-accent-bg text-text'
                  : 'border-border bg-surface-raised text-text-muted hover:border-border-strong',
              )}
            >
              <div>{opt.label}</div>
              {opt.sample && <div className="mt-0.5 text-[10px] font-medium text-text-faint">{opt.sample}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { reset } = usePreferences()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Appearance</h1>
          <p className="mt-1 text-sm text-text-muted">
            Personal, per-device — stored in this browser, not shared with your team.
          </p>
        </div>
        <Button variant="secondary" onClick={reset}>
          Reset to defaults
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-[15px]">Theme &amp; layout</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Segmented axis="theme" title="Theme" />
          <Segmented axis="accent" title="Accent" />
          <Segmented axis="shape" title="Shape" />
          <Segmented axis="density" title="Density" />
          <Segmented axis="nav" title="Nav layout" />
          <Segmented axis="font" title="Typeface pairing" />
        </CardBody>
      </Card>
    </div>
  )
}
