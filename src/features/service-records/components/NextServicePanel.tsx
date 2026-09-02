import { useState } from 'react'
import { Button, Card, CardBody, CardHeader, Field, TextInput, useToast } from '@/components/ui'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import { useServiceRecordNextService, useSetNextService } from '../api'

/**
 * The next-service recommendation.
 *
 * Setting one is what causes a reminder to be scheduled, so the mutation
 * invalidates the reminders tree — otherwise the vehicle's reminders tab keeps
 * showing the state from before this was set.
 */
export function NextServicePanel({ recordId }: { recordId: string }) {
  const toast = useToast()
  const nextService = useServiceRecordNextService(recordId)
  const setNext = useSetNextService(recordId)

  const existing = nextService.data
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [odometer, setOdometer] = useState(0)
  const [touched, setTouched] = useState(false)

  const apiError = asApiError(setNext.error)
  const hasRecommendation = Boolean(existing?.recommendedDate || existing?.recommendedOdometer)

  const startEditing = () => {
    setDate(existing?.recommendedDate?.slice(0, 10) ?? '')
    setOdometer(existing?.recommendedOdometer ?? 0)
    setTouched(false)
    setEditing(true)
  }

  return (
    <Card>
      <CardHeader
        title="Next service"
        description="Schedules a reminder for the customer."
        actions={
          !editing && (
            <Can rule={access.permission(PERMISSIONS.serviceRecord.update)}>
              <Button variant="ghost" size="sm" onClick={startEditing}>
                {hasRecommendation ? 'Edit' : 'Set'}
              </Button>
            </Can>
          )
        }
      />

      <CardBody className="flex flex-col gap-3">
        {editing ? (
          <>
            <Field
              label="Recommended date"
              required
              error={touched && !date ? 'Choose a date.' : undefined}
            >
              {(props) => (
                <TextInput
                  {...props}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </Field>

            <Field label="At odometer" hint="The reading the next service is due at.">
              {(props) => (
                <TextInput
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                />
              )}
            </Field>

            <div className="flex gap-2">
              <Button
                size="sm"
                loading={setNext.isPending}
                onClick={() => {
                  setTouched(true)
                  if (!date) return
                  setNext.mutate(
                    {
                      // The server's schema wants a full timestamp, but a date
                      // input only gives a day.
                      recommendedDate: new Date(date).toISOString(),
                      recommendedOdometer: odometer || undefined,
                    },
                    {
                      onSuccess: () => {
                        toast.success('Next service set')
                        setEditing(false)
                      },
                    },
                  )
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(false)}
                disabled={setNext.isPending}
              >
                Cancel
              </Button>
            </div>

            {apiError && <p className="text-sm text-critical">{apiError.userMessage}</p>}
          </>
        ) : nextService.isLoading ? (
          <div className="skeleton h-10 rounded-input" />
        ) : hasRecommendation ? (
          <div className="flex flex-col gap-1">
            {existing?.recommendedDate && (
              <div className="text-sm font-semibold">
                {new Date(existing.recommendedDate).toLocaleDateString()}
              </div>
            )}
            {existing?.recommendedOdometer ? (
              <div className="tabnum font-mono text-xs text-text-muted">
                at {existing.recommendedOdometer.toLocaleString()}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            No recommendation set. Adding one schedules a reminder for the customer.
          </p>
        )}
      </CardBody>
    </Card>
  )
}
