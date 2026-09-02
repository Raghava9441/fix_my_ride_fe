import { useState, type FormEvent } from 'react'
import { Field, SelectInput, TextInput } from '@/components/ui'
import type { CreateVehicleInput, FuelType, Transmission, Vehicle } from '../types'

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cng', label: 'CNG' },
  { value: 'lpg', label: 'LPG' },
]

const TRANSMISSIONS: { value: Transmission; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'cvt', label: 'CVT' },
]

export type VehicleFormValues = CreateVehicleInput

type Errors = Partial<Record<keyof VehicleFormValues | 'odometer', string>>

/**
 * Validation mirrors the server's DTO rather than inventing its own rules.
 *
 * The point isn't to replace server validation — it can't, and the API
 * validates again — it's to catch the obvious cases without a round trip, and
 * to fail with a message pinned to the field rather than a generic banner.
 * Where the two disagree the server wins, and `serverErrors` below feeds its
 * field errors back into the same slots.
 */
function validate(values: VehicleFormValues): Errors {
  const errors: Errors = {}
  const currentYear = new Date().getFullYear()

  if (!values.registrationNumber?.trim()) {
    errors.registrationNumber = 'Registration number is required.'
  }
  if (!values.make?.trim()) errors.make = 'Make is required.'
  if (!values.model?.trim()) errors.model = 'Model is required.'

  if (!values.year) {
    errors.year = 'Year is required.'
  } else if (values.year < 1900 || values.year > currentYear + 1) {
    // +1 because next model year is on sale before the calendar catches up.
    errors.year = `Enter a year between 1900 and ${currentYear + 1}.`
  }

  if (!values.fuelType) errors.fuelType = 'Fuel type is required.'

  // Same pattern the server uses: 17 characters, excluding I, O and Q because
  // they're indistinguishable from 1 and 0 in a VIN.
  if (values.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(values.vin)) {
    errors.vin = 'A VIN is 17 characters and cannot contain I, O, or Q.'
  }

  if (values.currentOdometer && values.currentOdometer.value < 0) {
    errors.odometer = 'Odometer cannot be negative.'
  }

  return errors
}

interface VehicleFormProps {
  /** Populates the form for editing. Omit to create. */
  vehicle?: Vehicle
  onSubmit: (values: VehicleFormValues) => void
  submitting?: boolean
  /** Field errors returned by the API, keyed by field name. */
  serverErrors?: Array<{ field?: string; message: string }>
  /** Rendered under the fields — the caller owns the buttons. */
  footer?: (state: { submit: () => void; dirty: boolean }) => React.ReactNode
  id?: string
}

export function VehicleForm({
  vehicle,
  onSubmit,
  submitting,
  serverErrors,
  footer,
  id = 'vehicle-form',
}: VehicleFormProps) {
  const [values, setValues] = useState<VehicleFormValues>({
    registrationNumber: vehicle?.registrationNumber ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year ?? new Date().getFullYear(),
    fuelType: vehicle?.fuelType ?? 'petrol',
    transmission: vehicle?.transmission,
    color: vehicle?.color ?? '',
    vin: vehicle?.vin ?? '',
    currentOdometer: vehicle?.currentOdometer
      ? { value: vehicle.currentOdometer.value, unit: vehicle.currentOdometer.unit }
      : { value: 0, unit: 'km' },
    currentOwnerId: undefined,
  })

  const [touched, setTouched] = useState(false)
  const [dirty, setDirty] = useState(false)

  const clientErrors = validate(values)

  // Server field errors take precedence: they reflect a rule the client
  // doesn't know about (a duplicate registration, say), so overwriting them
  // with a passing client check would hide the actual reason it failed.
  const errors: Errors = { ...clientErrors }
  for (const fieldError of serverErrors ?? []) {
    if (fieldError.field) errors[fieldError.field as keyof Errors] = fieldError.message
  }

  const set = <K extends keyof VehicleFormValues>(key: K, value: VehicleFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const submit = () => {
    setTouched(true)
    if (Object.keys(clientErrors).length > 0) {
      // Focus the first invalid control so the user lands on the problem
      // rather than hunting for a red border.
      const firstKey = Object.keys(clientErrors)[0]
      document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus()
      return
    }

    onSubmit({
      ...values,
      registrationNumber: values.registrationNumber.trim().toUpperCase(),
      make: values.make.trim(),
      model: values.model.trim(),
      // Empty strings would be stored as empty rather than absent.
      vin: values.vin?.trim() ? values.vin.trim().toUpperCase() : undefined,
      color: values.color?.trim() || undefined,
      currentOwnerId: values.currentOwnerId?.trim() || undefined,
    })
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit()
  }

  // Errors only surface after a submit attempt. Showing "required" on an
  // empty field the user hasn't reached yet is noise, not help.
  const show = (key: keyof Errors) => (touched ? errors[key] : undefined)

  return (
    <form id={id} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Registration number" required error={show('registrationNumber')}>
          {(props) => (
            <TextInput
              {...props}
              data-field="registrationNumber"
              value={values.registrationNumber}
              onChange={(e) => set('registrationNumber', e.target.value.toUpperCase())}
              placeholder="KA01AB1234"
              autoComplete="off"
              // Registration numbers are conventionally uppercase and the
              // server uppercases them anyway; showing them that way as you
              // type avoids the value changing after save.
              style={{ textTransform: 'uppercase' }}
            />
          )}
        </Field>

        <Field
          label="VIN"
          error={show('vin')}
          hint="17 characters. Optional, but it's the only globally unique id."
        >
          {(props) => (
            <TextInput
              {...props}
              data-field="vin"
              value={values.vin ?? ''}
              onChange={(e) => set('vin', e.target.value.toUpperCase())}
              placeholder="1HGBH41JXMN109186"
              maxLength={17}
              autoComplete="off"
              style={{ textTransform: 'uppercase' }}
            />
          )}
        </Field>

        <Field label="Make" required error={show('make')}>
          {(props) => (
            <TextInput
              {...props}
              data-field="make"
              value={values.make}
              onChange={(e) => set('make', e.target.value)}
              placeholder="Toyota"
            />
          )}
        </Field>

        <Field label="Model" required error={show('model')}>
          {(props) => (
            <TextInput
              {...props}
              data-field="model"
              value={values.model}
              onChange={(e) => set('model', e.target.value)}
              placeholder="Camry"
            />
          )}
        </Field>

        <Field label="Year" required error={show('year')}>
          {(props) => (
            <TextInput
              {...props}
              data-field="year"
              type="number"
              inputMode="numeric"
              value={values.year || ''}
              onChange={(e) => set('year', Number(e.target.value))}
              min={1900}
              max={new Date().getFullYear() + 1}
            />
          )}
        </Field>

        <Field label="Colour">
          {(props) => (
            <TextInput
              {...props}
              value={values.color ?? ''}
              onChange={(e) => set('color', e.target.value)}
              placeholder="Silver"
            />
          )}
        </Field>

        <Field label="Fuel type" required error={show('fuelType')}>
          {(props) => (
            <SelectInput
              {...props}
              data-field="fuelType"
              value={values.fuelType}
              onChange={(e) => set('fuelType', e.target.value as FuelType)}
            >
              {FUEL_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Transmission">
          {(props) => (
            <SelectInput
              {...props}
              value={values.transmission ?? ''}
              onChange={(e) =>
                set('transmission', (e.target.value || undefined) as Transmission | undefined)
              }
            >
              <option value="">Not specified</option>
              {TRANSMISSIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>

      {/*
        Only shown when creating. On an existing vehicle, changing the owner is
        a transfer — it appends to the ownership history and moves the vehicle
        between people's lists — so it has its own dialog rather than being a
        field you can edit in passing.
      */}
      {!vehicle && (
        <Field
          label="Owner ID"
          hint="Leave blank to register this vehicle to yourself."
          error={show('currentOwnerId')}
        >
          {(props) => (
            <TextInput
              {...props}
              data-field="currentOwnerId"
              value={values.currentOwnerId ?? ''}
              onChange={(e) => set('currentOwnerId', e.target.value || undefined)}
              placeholder="Blank = you"
              autoComplete="off"
              className="font-mono"
            />
          )}
        </Field>
      )}

      <fieldset className="grid grid-cols-[1fr_auto] gap-3">
        <legend className="sr-only">Current odometer</legend>

        <Field label="Current odometer" error={show('odometer')}>
          {(props) => (
            <TextInput
              {...props}
              data-field="odometer"
              type="number"
              inputMode="numeric"
              min={0}
              value={values.currentOdometer?.value ?? 0}
              onChange={(e) =>
                set('currentOdometer', {
                  value: Number(e.target.value),
                  unit: values.currentOdometer?.unit ?? 'km',
                })
              }
            />
          )}
        </Field>

        <Field label="Unit">
          {(props) => (
            <SelectInput
              {...props}
              value={values.currentOdometer?.unit ?? 'km'}
              onChange={(e) =>
                set('currentOdometer', {
                  value: values.currentOdometer?.value ?? 0,
                  unit: e.target.value as 'km' | 'miles',
                })
              }
            >
              <option value="km">km</option>
              <option value="miles">miles</option>
            </SelectInput>
          )}
        </Field>
      </fieldset>

      {footer?.({ submit, dirty: dirty && !submitting })}
    </form>
  )
}
