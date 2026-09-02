import { useState } from 'react'
import { Button, Field, Modal, SelectInput, TextArea, TextInput, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { useCreateOdometerReading } from '../api'
import type { Vehicle } from '../types'

interface RecordOdometerDialogProps {
  vehicle: Vehicle
  open: boolean
  onClose: () => void
}

export function RecordOdometerDialog({ vehicle, open, onClose }: RecordOdometerDialogProps) {
  const toast = useToast()
  const createReading = useCreateOdometerReading(vehicle._id)

  const current = vehicle.currentOdometer
  const [value, setValue] = useState<number>(current?.value ?? 0)
  const [unit, setUnit] = useState<'km' | 'miles'>(current?.unit ?? 'km')
  const [notes, setNotes] = useState('')
  const [touched, setTouched] = useState(false)

  const apiError = asApiError(createReading.error)

  /*
   * An odometer only goes up. A reading below the current one is almost
   * always a typo — a transposed digit, or kilometres entered into a miles
   * field — and accepting it silently corrupts every "distance since last
   * service" calculation downstream.
   *
   * It's a warning rather than a hard block: odometers do get replaced, and
   * corrections are legitimate. The user can proceed, having been told.
   */
  const goesBackwards =
    current !== undefined && unit === current.unit && value < current.value

  const invalid = value < 0 || Number.isNaN(value)

  const submit = () => {
    setTouched(true)
    if (invalid) return

    createReading.mutate(
      { value, unit, notes: notes.trim() || undefined, source: 'manual_entry' },
      {
        onSuccess: () => {
          toast.success('Odometer reading recorded', `${value.toLocaleString()} ${unit}`)
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record odometer reading"
      description={vehicle.registrationNumber}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={createReading.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={createReading.isPending}>
            Record reading
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {current && (
          <p className="text-xs text-text-muted">
            Current reading{' '}
            <span className="tabnum font-mono font-semibold text-text">
              {current.value.toLocaleString()} {current.unit}
            </span>
          </p>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field
            label="New reading"
            required
            error={touched && invalid ? 'Enter a positive number.' : undefined}
          >
            {(props) => (
              <TextInput
                {...props}
                type="number"
                inputMode="numeric"
                min={0}
                autoFocus
                value={Number.isNaN(value) ? '' : value}
                onChange={(e) => setValue(Number(e.target.value))}
              />
            )}
          </Field>

          <Field label="Unit">
            {(props) => (
              <SelectInput
                {...props}
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'km' | 'miles')}
              >
                <option value="km">km</option>
                <option value="miles">miles</option>
              </SelectInput>
            )}
          </Field>
        </div>

        {goesBackwards && (
          <p className="rounded-input bg-warning-bg px-3 py-2 text-xs text-warning">
            This is lower than the current reading. That's usually a typo — check it before saving,
            or add a note explaining the correction.
          </p>
        )}

        <Field label="Notes" hint="Optional. Useful when correcting a previous reading.">
          {(props) => (
            <TextArea
              {...props}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Read at service intake"
            />
          )}
        </Field>

        {apiError && <p className="text-sm text-critical">{apiError.userMessage}</p>}
      </div>
    </Modal>
  )
}
