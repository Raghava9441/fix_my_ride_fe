import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Alert, Button, Card, CardBody, CardHeader, Switch, useToast } from '@/components/ui'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import type { StaffOutletContext } from '../StaffDetailPage'
import { useStaffSchedule, useUpdateStaffSchedule } from '../api'
import { WEEKDAYS, dayLabel, type Weekday } from '../staffMember'
import type { WorkSchedule } from '../types'

const DEFAULT_START = '09:00'
const DEFAULT_END = '17:00'

/**
 * The weekly rota, editable.
 *
 * ---- Why this holds a draft instead of saving per field ----
 *
 * A rota is edited as a unit: you turn Saturday on, shorten Friday, and
 * decide at the end whether that is what you meant. `PUT /schedule` replaces
 * the whole object, so a per-field autosave would issue seven requests for
 * one mental edit and leave a half-applied week if one failed. The draft is
 * local until Save, and Reset restores the server's copy.
 */
export default function StaffScheduleTab() {
  const { staffId } = useOutletContext<StaffOutletContext>()
  const toast = useToast()

  const { data, isLoading, isError, error } = useStaffSchedule(staffId)
  const updateSchedule = useUpdateStaffSchedule(staffId)

  const [draft, setDraft] = useState<WorkSchedule | null>(null)
  const [seededFrom, setSeededFrom] = useState<WorkSchedule | undefined>(undefined)

  /*
   * Seeds the draft from the server copy, and re-seeds whenever that copy
   * changes identity — after a successful save, and after a refetch on
   * window focus.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately with the new state and before anything is painted,
   * so there is no flash of the stale draft; an effect would commit the old
   * value first and then correct it. It also compares against the object the
   * draft was last seeded from, so an unrelated re-render cannot wipe an
   * edit in progress.
   */
  if (data && data !== seededFrom) {
    setSeededFrom(data)
    setDraft(structuredClone(data))
  }

  const schedule = draft ?? data
  const apiError = asApiError(error ?? updateSchedule.error)

  function setDay(day: Weekday, patch: Partial<{ start: string; end: string; available: boolean }>) {
    setDraft((prev) => {
      const base = prev ?? data ?? {}
      return { ...base, [day]: { ...base[day], ...patch } }
    })
  }

  const dirty = draft !== null && data !== undefined && JSON.stringify(draft) !== JSON.stringify(data)

  function save() {
    if (!draft) return
    updateSchedule.mutate(draft, {
      onSuccess: () => toast.success('Schedule saved'),
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="skeleton h-72 w-full rounded-input" />
        </CardBody>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-2 text-sm">
          <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load the schedule.'}</p>
          {apiError?.requestId && (
            <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
          )}
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Working hours"
        description="Days this person is available, and the hours they work."
      />
      <CardBody className="flex flex-col gap-4">
        {updateSchedule.isError ? (
          <Alert tone="critical" reference={apiError?.requestId}>
            {apiError?.userMessage ?? 'Couldn’t save the schedule.'}
          </Alert>
        ) : null}

        <Can rule={access.permission(PERMISSIONS.staffProfile.update)} mode="disable">
          <ul className="flex flex-col divide-y divide-border">
            {WEEKDAYS.map((day) => {
              const entry = schedule?.[day]
              const on = Boolean(entry?.available)

              return (
                <li
                  key={day}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
                >
                  {/* `Switch` is a full-width label row with the control on
                      its right, so it needs a width to sit against rather
                      than stretching the times off the end of the row. */}
                  <div className="w-full min-w-0 sm:w-52">
                    <Switch
                      checked={on}
                      onChange={(checked) =>
                        setDay(day, {
                          available: checked,
                          // Turning a day on with no hours set would save an
                          // "available" day with no times, which reads on the
                          // overview as a tick with nothing behind it.
                          start: entry?.start ?? DEFAULT_START,
                          end: entry?.end ?? DEFAULT_END,
                        })
                      }
                      label={dayLabel(day)}
                    />
                  </div>

                  {/* Times stay mounted but disabled when the day is off, so
                      the row doesn't change height as it is toggled and the
                      previous hours are still visible to come back to. */}
                  <div className="flex items-center gap-2">
                    <TimeInput
                      aria-label={`${dayLabel(day)} start`}
                      value={entry?.start ?? ''}
                      disabled={!on}
                      onChange={(value) => setDay(day, { start: value })}
                    />
                    <span className={on ? 'text-text-faint' : 'text-text-faint/40'}>–</span>
                    <TimeInput
                      aria-label={`${dayLabel(day)} end`}
                      value={entry?.end ?? ''}
                      disabled={!on}
                      onChange={(value) => setDay(day, { end: value })}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Can>

        <Can rule={access.permission(PERMISSIONS.staffProfile.update)}>
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button onClick={save} disabled={!dirty} loading={updateSchedule.isPending}>
              Save schedule
            </Button>
            <Button
              variant="ghost"
              disabled={!dirty || updateSchedule.isPending}
              onClick={() => setDraft(data ? structuredClone(data) : null)}
            >
              Reset
            </Button>
            {dirty ? <span className="text-xs text-text-muted">Unsaved changes</span> : null}
          </div>
        </Can>
      </CardBody>
    </Card>
  )
}

function TimeInput({
  value,
  disabled,
  onChange,
  ...props
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  'aria-label': string
}) {
  return (
    <input
      {...props}
      type="time"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="interactive tabnum w-[6.5rem] rounded-input border border-border bg-surface px-2 py-1.5 font-mono text-sm text-text focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
    />
  )
}
