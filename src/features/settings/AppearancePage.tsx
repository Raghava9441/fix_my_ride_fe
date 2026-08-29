import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Card, CardBody, CardHeader, SegmentedControl } from '@/components/ui'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'
import { APPEARANCE_AXES, AXIS_GROUPS, type Preferences } from '@/lib/preferences/types'

/**
 * Renders itself from `APPEARANCE_AXES`.
 *
 * There is no per-axis JSX here on purpose: adding a customization axis is a
 * block in tokens.css plus an entry in the preference registry, and it shows
 * up here with its label, description, and options already correct. Screens
 * that hard-code their controls are where design systems go stale — the
 * token exists, the control was never added, nobody can reach it.
 */
export default function AppearancePage() {
  const { preferences, setPreference, reset } = usePreferences()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Appearance"
        description="Personal and per-device — stored in this browser, never shared with your workspace."
        actions={
          <Button variant="secondary" size="sm" onClick={reset}>
            Reset to defaults
          </Button>
        }
      />

      {AXIS_GROUPS.map((group) => {
        const axes = APPEARANCE_AXES.filter((axis) => axis.group === group.id)
        if (axes.length === 0) return null

        return (
          <Card key={group.id}>
            <CardHeader title={group.label} description={group.description} />
            <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {axes.map((axis) => (
                <SegmentedControl
                  key={axis.key}
                  legend={axis.label}
                  description={axis.description}
                  options={axis.options}
                  value={preferences[axis.key] as string}
                  onChange={(value) => setPreference(axis.key, value as Preferences[typeof axis.key])}
                  columns={axis.options.length > 3 ? 'grid' : 'auto'}
                />
              ))}
            </CardBody>
          </Card>
        )
      })}

      <Card>
        <CardHeader title="Preview" description="Every element below reads the same tokens the rest of the app does." />
        <CardBody className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </CardBody>
      </Card>
    </div>
  )
}
