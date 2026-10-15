import { useState, type FormEvent } from 'react'
import { Alert, Button, Field, TextInput } from '@/components/ui'
import type { ApiError } from '@/lib/api'
import type { CreateServiceCenterInput, ServiceCenter } from '../types'

type Values = {
  name: string
  businessRegistrationNumber: string
  email: string
  phone: string
  website: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

function initialValues(center?: ServiceCenter): Values {
  return {
    name: center?.name ?? '',
    businessRegistrationNumber: center?.businessRegistrationNumber ?? '',
    email: center?.email ?? '',
    phone: center?.phone ?? '',
    website: center?.website ?? '',
    street: center?.address?.street ?? '',
    city: center?.address?.city ?? '',
    state: center?.address?.state ?? '',
    postalCode: center?.address?.postalCode ?? '',
    country: center?.address?.country ?? '',
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The shared body of the create and edit dialogs.
 *
 * Validation here is only what saves a round trip: required fields and an
 * email shaped like one. The API stays the authority; its message is shown in
 * full above the form when it disagrees.
 */
export function ServiceCenterForm({
  center,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  center?: ServiceCenter
  submitLabel: string
  pending: boolean
  error: ApiError | undefined
  onSubmit: (input: CreateServiceCenterInput) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<Values>(() => initialValues(center))
  const [touched, setTouched] = useState(false)

  const set = (key: keyof Values) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }))

  const errors: Partial<Record<keyof Values, string>> = {}
  if (!values.name.trim()) errors.name = 'Enter a name.'
  if (!values.businessRegistrationNumber.trim())
    errors.businessRegistrationNumber = 'Enter the registration number.'
  if (!EMAIL_RE.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.phone.trim()) errors.phone = 'Enter a phone number.'

  const show = (key: keyof Values) => (touched ? errors[key] : undefined)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length > 0) return

    const clean = (value: string) => value.trim() || undefined
    onSubmit({
      name: values.name.trim(),
      businessRegistrationNumber: values.businessRegistrationNumber.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      website: clean(values.website),
      address: {
        street: clean(values.street),
        city: clean(values.city),
        state: clean(values.state),
        postalCode: clean(values.postalCode),
        country: clean(values.country),
      },
    })
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {error ? (
        <Alert tone="critical" reference={error.requestId}>
          {error.userMessage}
        </Alert>
      ) : null}

      <Field label="Name" required error={show('name')}>
        {(props) => (
          <TextInput {...props} value={values.name} onChange={set('name')} autoComplete="organization" />
        )}
      </Field>

      <Field
        label="Business registration number"
        required
        error={show('businessRegistrationNumber')}
      >
        {(props) => (
          <TextInput
            {...props}
            value={values.businessRegistrationNumber}
            onChange={set('businessRegistrationNumber')}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" required error={show('email')}>
          {(props) => <TextInput {...props} type="email" value={values.email} onChange={set('email')} />}
        </Field>
        <Field label="Phone" required error={show('phone')}>
          {(props) => <TextInput {...props} type="tel" value={values.phone} onChange={set('phone')} />}
        </Field>
      </div>

      <Field label="Website" hint="Optional.">
        {(props) => (
          <TextInput {...props} value={values.website} onChange={set('website')} placeholder="example.com" />
        )}
      </Field>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-text-faint">
          Address
        </legend>
        <Field label="Street">
          {(props) => (
            <TextInput {...props} value={values.street} onChange={set('street')} autoComplete="street-address" />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            {(props) => <TextInput {...props} value={values.city} onChange={set('city')} />}
          </Field>
          <Field label="State / region">
            {(props) => <TextInput {...props} value={values.state} onChange={set('state')} />}
          </Field>
          <Field label="Postal code">
            {(props) => <TextInput {...props} value={values.postalCode} onChange={set('postalCode')} />}
          </Field>
          <Field label="Country">
            {(props) => <TextInput {...props} value={values.country} onChange={set('country')} />}
          </Field>
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
