import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  SelectInput,
  Switch,
  TextInput,
  useToast,
} from '@/components/ui'
import { formatCurrency } from '@/components/charts'
import { asApiError } from '@/lib/queryClient'
import type { ServiceCenterOutletContext } from '../ServiceCenterDetailPage'
import {
  useAddOfferedService,
  useRemoveOfferedService,
  useServiceCenterServices,
  useServiceCenterSettings,
  useUpdateOfferedService,
  useUpdateServiceCenterSettings,
} from '../api'
import { BUSINESS_DAYS, COMMON_CURRENCIES, dayLabel } from '../serviceCenter'
import type { BusinessHours, OfferedService, ServiceCenterSettings } from '../types'

const DEFAULT_OPEN = '09:00'
const DEFAULT_CLOSE = '18:00'

/**
 * Operating hours, currency and timezone, plus the service catalogue.
 *
 * Hours are edited as a draft and saved as a unit — `PUT /settings` replaces
 * the object, so per-field autosave would be several requests for one edit
 * and could leave a half-applied week. The catalogue is the opposite: each
 * service is its own record with its own endpoint, so it saves per action.
 */
export default function CenterSettingsTab() {
  return (
    <div className="flex flex-col gap-4">
      <HoursCard />
      <CatalogueCard />
    </div>
  )
}

/* ================================================================
 * Hours, currency, timezone
 * ============================================================== */

function HoursCard() {
  const { serviceCenterId } = useOutletContext<ServiceCenterOutletContext>()
  const toast = useToast()

  const { data, isLoading, isError, error } = useServiceCenterSettings(serviceCenterId)
  const update = useUpdateServiceCenterSettings(serviceCenterId)

  const [draft, setDraft] = useState<ServiceCenterSettings | null>(null)
  const [seededFrom, setSeededFrom] = useState<ServiceCenterSettings | undefined>(undefined)

  // Re-seed whenever the server copy changes identity (after save or refetch),
  // adjusting during render so there is no flash of the stale draft. Compared
  // against the object last seeded from so an unrelated re-render can't wipe
  // an edit in progress.
  if (data && data !== seededFrom) {
    setSeededFrom(data)
    setDraft(structuredClone(data))
  }

  const settings = draft ?? data
  const apiError = asApiError(error ?? update.error)
  const dirty = draft !== null && data !== undefined && JSON.stringify(draft) !== JSON.stringify(data)

  function setDay(day: string, patch: Partial<BusinessHours[string]>) {
    setDraft((prev) => {
      const base = prev ?? data
      if (!base) return prev
      return {
        ...base,
        businessHours: { ...base.businessHours, [day]: { ...base.businessHours?.[day], ...patch } },
      }
    })
  }

  function setField(patch: Partial<Pick<ServiceCenterSettings, 'currency' | 'timezone'>>) {
    setDraft((prev) => {
      const base = prev ?? data
      return base ? { ...base, ...patch } : prev
    })
  }

  function save() {
    if (!draft) return
    update.mutate(draft, { onSuccess: () => toast.success('Settings saved') })
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
          <p className="text-critical">{apiError?.userMessage ?? 'Couldn’t load settings.'}</p>
          {apiError?.requestId && (
            <p className="font-mono text-xs text-text-faint">Reference: {apiError.requestId}</p>
          )}
        </CardBody>
      </Card>
    )
  }

  const currencies = settings?.currency && !COMMON_CURRENCIES.includes(settings.currency)
    ? [settings.currency, ...COMMON_CURRENCIES]
    : COMMON_CURRENCIES

  return (
    <Card>
      <CardHeader title="Hours and locale" description="When this center is open, and how amounts are shown." />
      <CardBody className="flex flex-col gap-4">
        {update.isError ? (
          <Alert tone="critical" reference={apiError?.requestId}>
            {apiError?.userMessage ?? 'Couldn’t save settings.'}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency">
            {(props) => (
              <SelectInput
                {...props}
                value={settings?.currency ?? ''}
                onChange={(e) => setField({ currency: e.target.value })}
              >
                {!settings?.currency ? <option value="">Select a currency</option> : null}
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label="Timezone" hint="IANA name, e.g. Asia/Kolkata.">
            {(props) => (
              <TextInput
                {...props}
                value={settings?.timezone ?? ''}
                onChange={(e) => setField({ timezone: e.target.value })}
              />
            )}
          </Field>
        </div>

        <ul className="flex flex-col divide-y divide-border">
          {BUSINESS_DAYS.map((day) => {
            const entry = settings?.businessHours?.[day]
            const open = Boolean(entry) && !entry?.closed && Boolean(entry?.open || entry?.close)

            return (
              <li
                key={day}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="w-full min-w-0 sm:w-52">
                  <Switch
                    checked={open}
                    onChange={(checked) =>
                      setDay(day, {
                        closed: !checked,
                        // Opening a day with no times would save an "open" day
                        // with nothing behind it.
                        open: entry?.open ?? DEFAULT_OPEN,
                        close: entry?.close ?? DEFAULT_CLOSE,
                      })
                    }
                    label={dayLabel(day)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <TimeInput
                    aria-label={`${dayLabel(day)} opens`}
                    value={entry?.open ?? ''}
                    disabled={!open}
                    onChange={(value) => setDay(day, { open: value })}
                  />
                  <span className={open ? 'text-text-faint' : 'text-text-faint/40'}>–</span>
                  <TimeInput
                    aria-label={`${dayLabel(day)} closes`}
                    value={entry?.close ?? ''}
                    disabled={!open}
                    onChange={(value) => setDay(day, { close: value })}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Button onClick={save} disabled={!dirty} loading={update.isPending}>
            Save settings
          </Button>
          <Button
            variant="ghost"
            disabled={!dirty || update.isPending}
            onClick={() => setDraft(data ? structuredClone(data) : null)}
          >
            Reset
          </Button>
          {dirty ? <span className="text-xs text-text-muted">Unsaved changes</span> : null}
        </div>
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

/* ================================================================
 * Service catalogue
 * ============================================================== */

function CatalogueCard() {
  const { serviceCenterId } = useOutletContext<ServiceCenterOutletContext>()
  const toast = useToast()

  const services = useServiceCenterServices(serviceCenterId)
  const settings = useServiceCenterSettings(serviceCenterId)
  const add = useAddOfferedService(serviceCenterId)
  const update = useUpdateOfferedService(serviceCenterId)
  const remove = useRemoveOfferedService(serviceCenterId)

  const [values, setValues] = useState({ name: '', category: '', duration: '', basePrice: '' })
  const [touched, setTouched] = useState(false)
  const [removing, setRemoving] = useState<OfferedService | null>(null)

  const currency = settings.data?.currency
  const items = services.data ?? []
  const apiError = asApiError(add.error ?? update.error ?? remove.error ?? services.error)

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }))

  const nameError = touched && !values.name.trim() ? 'Enter a name.' : undefined

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!values.name.trim()) return

    const duration = Number(values.duration)
    const basePrice = Number(values.basePrice)

    add.mutate(
      {
        name: values.name.trim(),
        category: values.category.trim() || undefined,
        duration: values.duration && Number.isFinite(duration) ? duration : undefined,
        basePrice: values.basePrice && Number.isFinite(basePrice) ? basePrice : undefined,
        isActive: true,
      },
      {
        onSuccess: () => {
          toast.success('Service added')
          setValues({ name: '', category: '', duration: '', basePrice: '' })
          setTouched(false)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader
        title="Service catalogue"
        description="What this center offers. Inactive services stay on record but aren't advertised."
      />
      <CardBody className="flex flex-col gap-4">
        {apiError ? (
          <Alert tone="critical" reference={apiError.requestId}>
            {apiError.userMessage}
          </Alert>
        ) : null}

        {services.isLoading ? (
          <div className="skeleton h-24 w-full rounded-input" />
        ) : items.length > 0 ? (
          <ul className="divide-y divide-border rounded-input border border-border">
            {items.map((service, index) => (
              <li
                key={service._id ?? index}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">
                      {service.name ?? 'Unnamed service'}
                    </span>
                    {!service.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {[
                      service.category,
                      service.duration ? `${service.duration} min` : undefined,
                      service.basePrice != null ? formatCurrency(service.basePrice, currency) : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
                {service._id ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          serviceId: service._id!,
                          input: { isActive: !service.isActive },
                        })
                      }
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(service)}>
                      Remove
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">No services yet. Add the first one below.</p>
        )}

        <form
          className="flex flex-col gap-4 border-t border-border pt-4"
          onSubmit={handleAdd}
          noValidate
        >
          <span className="text-xs font-bold uppercase tracking-wide text-text-faint">
            Add a service
          </span>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={nameError}>
              {(props) => (
                <TextInput {...props} value={values.name} onChange={set('name')} placeholder="e.g. Oil change" />
              )}
            </Field>
            <Field label="Category">
              {(props) => (
                <TextInput {...props} value={values.category} onChange={set('category')} placeholder="e.g. Maintenance" />
              )}
            </Field>
            <Field label="Duration (minutes)">
              {(props) => (
                <TextInput {...props} type="number" min={0} value={values.duration} onChange={set('duration')} />
              )}
            </Field>
            <Field label={`Base price${currency ? ` (${currency})` : ''}`}>
              {(props) => (
                <TextInput {...props} type="number" min={0} step="0.01" value={values.basePrice} onChange={set('basePrice')} />
              )}
            </Field>
          </div>
          <div>
            <Button type="submit" loading={add.isPending}>
              Add service
            </Button>
          </div>
        </form>
      </CardBody>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        loading={remove.isPending}
        danger
        title="Remove this service?"
        description={`${removing?.name ?? 'This service'} is taken off the catalogue. Past service records are unaffected.`}
        confirmLabel="Remove"
        onConfirm={() => {
          const id = removing?._id
          if (!id) return
          remove.mutate(id, {
            onSuccess: () => {
              toast.success('Service removed')
              setRemoving(null)
            },
          })
        }}
      />
    </Card>
  )
}
