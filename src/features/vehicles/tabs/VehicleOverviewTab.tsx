import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { formatCurrency } from '@/components/charts'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  Field,
  Modal,
  TextInput,
  useToast,
} from '@/components/ui'
import { BuildingIcon, QueueIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { isPopulated, refId } from '@/lib/api'
import { asApiError } from '@/lib/queryClient'
import {
  useUpdateInsurance,
  useUpdateWarranty,
  useVehicleInsurance,
  useVehicleOdometerReadings,
  useVehicleServiceCenters,
  useVehicleStats,
  useVehicleWarranty,
} from '../api'
import type { VehicleInsurance, VehicleWarranty } from '../types'
import type { VehicleOutletContext } from '../VehicleDetailPage'

function formatDate(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

/** Days until a date, negative once past. Used to flag expiry. */
function daysUntil(value?: string): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000)
}

function ExpiryBadge({ endDate }: { endDate?: string }) {
  const days = daysUntil(endDate)
  if (days === null) return null

  // Expiry is the single actionable fact on a policy — surfacing it as a
  // status pill means you don't have to do date arithmetic to notice.
  if (days < 0) return <Badge tone="critical">Expired</Badge>
  if (days <= 30) return <Badge tone="warning">{days}d left</Badge>
  return <Badge tone="success">Active</Badge>
}

export default function VehicleOverviewTab() {
  const { vehicleId, vehicle } = useOutletContext<VehicleOutletContext>()
  const [editing, setEditing] = useState<'warranty' | 'insurance' | null>(null)

  const warranty = useVehicleWarranty(vehicleId)
  const insurance = useVehicleInsurance(vehicleId)
  const centers = useVehicleServiceCenters(vehicleId)
  const stats = useVehicleStats(vehicleId)
  const readings = useVehicleOdometerReadings(vehicleId, { limit: 5 })

  const odometer = vehicle.currentOdometer
  const schedule = vehicle.serviceSchedule

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Card>
          <CardHeader title="Specification" description="As registered." />
          <CardBody>
            <DescriptionList
              columns={3}
              items={[
                { label: 'Registration', value: <span className="font-mono">{vehicle.registrationNumber}</span> },
                { label: 'VIN', value: vehicle.vin ? <span className="font-mono text-xs">{vehicle.vin}</span> : undefined },
                { label: 'Year', value: vehicle.year },
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Colour', value: vehicle.color },
                { label: 'Fuel type', value: vehicle.fuelType },
                { label: 'Transmission', value: vehicle.transmission },
                {
                  label: 'Odometer',
                  value: odometer ? (
                    <span className="tabnum font-mono">
                      {odometer.value.toLocaleString()} {odometer.unit}
                    </span>
                  ) : undefined,
                },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Service schedule"
            description="When this vehicle is next due."
            actions={
              schedule?.nextServiceDueDate && (
                <ExpiryBadge endDate={schedule.nextServiceDueDate} />
              )
            }
          />
          <CardBody>
            <DescriptionList
              columns={2}
              items={[
                { label: 'Last serviced', value: formatDate(schedule?.lastServiceDate) },
                {
                  label: 'Last service odometer',
                  value: schedule?.lastServiceOdometer?.toLocaleString(),
                },
                { label: 'Next due', value: formatDate(schedule?.nextServiceDueDate) },
                {
                  label: 'Next due odometer',
                  value: schedule?.nextServiceDueOdometer?.toLocaleString(),
                },
              ]}
            />
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PolicyCard
            title="Warranty"
            data={warranty.data}
            loading={warranty.isLoading}
            onEdit={() => setEditing('warranty')}
          />
          <PolicyCard
            title="Insurance"
            data={insurance.data}
            loading={insurance.isLoading}
            onEdit={() => setEditing('insurance')}
            extra={
              insurance.data?.premium
                ? [{ label: 'Premium', value: formatCurrency(insurance.data.premium) }]
                : []
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Recent odometer readings" />
          <CardBody className="p-0">
            {readings.isLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-9 rounded-input" />
                ))}
              </div>
            ) : (readings.data?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={QueueIcon}
                size="sm"
                title="No readings"
                description="Record one from the header to start tracking distance."
              />
            ) : (
              <ul>
                {readings.data?.items.map((reading) => (
                  <li
                    key={reading._id}
                    className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="tabnum font-mono text-sm font-semibold">
                        {reading.value.toLocaleString()} {reading.unit}
                      </div>
                      <div className="truncate text-[11px] text-text-muted">
                        {formatDate(reading.recordedAt)}
                        {reading.notes && ` · ${reading.notes}`}
                      </div>
                    </div>
                    {reading.isVerified && <Badge tone="success">Verified</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Authorised centers"
            description="Who may service this vehicle."
          />
          <CardBody className="p-0">
            {centers.isLoading ? (
              <div className="p-4">
                <div className="skeleton h-9 rounded-input" />
              </div>
            ) : (centers.data?.length ?? 0) === 0 ? (
              <EmptyState
                icon={BuildingIcon}
                size="sm"
                title="No centers authorised"
                description="Only the owner can see this vehicle until a center is authorised."
              />
            ) : (
              <ul>
                {centers.data?.map((entry) => {
                  // The endpoint populates this; other endpoints return a bare
                  // id. Handle both rather than assuming the convenient one.
                  const center = isPopulated(entry.serviceCenterId) ? entry.serviceCenterId : null
                  const id = refId(entry.serviceCenterId) ?? ''

                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {center?.name ?? <span className="font-mono text-xs">{id}</span>}
                        </div>
                        <div className="truncate text-[11px] text-text-muted">
                          {entry.accessLevel} access
                          {center?.address?.city && ` · ${center.address.city}`}
                          {entry.isPrimary && ' · primary'}
                        </div>
                      </div>
                      <Badge tone={entry.status === 'active' ? 'success' : 'neutral'}>
                        {entry.status}
                      </Badge>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {stats.data && (
          <Card>
            <CardHeader title="Lifetime" />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  { label: 'Services', value: stats.data.serviceCount },
                  {
                    label: 'Total service cost',
                    // Neither `/vehicles/:id/stats` nor `/vehicles/:id/insurance`
                    // returns a currency, so both fall back to the app default.
                    // `toLocaleString()` here rendered a bare number — "12,500"
                    // with no indication of what it was denominated in.
                    value:
                      stats.data.totalServiceCost != null
                        ? formatCurrency(stats.data.totalServiceCost)
                        : undefined,
                  },
                  {
                    label: 'Average interval',
                    // Null until there are two services to measure between —
                    // the DescriptionList renders that as a dash.
                    value:
                      stats.data.averageServiceIntervalDays != null
                        ? `${stats.data.averageServiceIntervalDays} days`
                        : undefined,
                  },
                ]}
              />
            </CardBody>
          </Card>
        )}
      </div>

      <PolicyDialog
        kind={editing}
        vehicleId={vehicleId}
        warranty={warranty.data}
        insurance={insurance.data}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */

function PolicyCard({
  title,
  data,
  loading,
  onEdit,
  extra = [],
}: {
  title: string
  data?: VehicleWarranty | VehicleInsurance
  loading?: boolean
  onEdit: () => void
  extra?: { label: string; value: React.ReactNode }[]
}) {
  const empty = !data || (!data.provider && !data.policyNumber && !data.endDate)

  return (
    <Card>
      <CardHeader
        title={title}
        actions={
          <div className="flex items-center gap-2">
            {!empty && <ExpiryBadge endDate={data?.endDate} />}
            <Can rule={access.permission(PERMISSIONS.vehicle.update)}>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                {empty ? 'Add' : 'Edit'}
              </Button>
            </Can>
          </div>
        }
      />
      <CardBody>
        {loading ? (
          <div className="skeleton h-16 rounded-input" />
        ) : empty ? (
          <p className="text-xs text-text-muted">No {title.toLowerCase()} on record.</p>
        ) : (
          <DescriptionList
            columns={1}
            items={[
              { label: 'Provider', value: data?.provider },
              { label: 'Policy number', value: data?.policyNumber },
              { label: 'Expires', value: formatDate(data?.endDate) },
              ...extra,
            ]}
          />
        )}
      </CardBody>
    </Card>
  )
}

/**
 * One dialog for both policies.
 *
 * Warranty and insurance carry the same four fields and differ only in
 * wording, so two near-identical components would be duplication that drifts
 * the first time one gains a field.
 */
function PolicyDialog({
  kind,
  vehicleId,
  warranty,
  insurance,
  onClose,
}: {
  kind: 'warranty' | 'insurance' | null
  vehicleId: string
  warranty?: VehicleWarranty
  insurance?: VehicleInsurance
  onClose: () => void
}) {
  const toast = useToast()
  const updateWarranty = useUpdateWarranty(vehicleId)
  const updateInsurance = useUpdateInsurance(vehicleId)

  const isWarranty = kind === 'warranty'
  const current = isWarranty ? warranty : insurance
  const mutation = isWarranty ? updateWarranty : updateInsurance
  const apiError = asApiError(mutation.error)

  const [values, setValues] = useState<VehicleInsurance>({})

  // Re-seed each time the dialog opens so it reflects the current record
  // rather than whatever was typed the last time it was open.
  const seedKey = `${kind}-${current?.policyNumber ?? ''}-${current?.endDate ?? ''}`

  return (
    <Modal
      open={kind !== null}
      onClose={onClose}
      title={isWarranty ? 'Warranty' : 'Insurance'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={mutation.isPending}
            onClick={() =>
              mutation.mutate(values, {
                onSuccess: () => {
                  toast.success(`${isWarranty ? 'Warranty' : 'Insurance'} saved`)
                  onClose()
                },
              })
            }
          >
            Save
          </Button>
        </>
      }
    >
      <PolicyFields
        key={seedKey}
        initial={current ?? {}}
        showPremium={!isWarranty}
        onChange={setValues}
      />
      {apiError && <p className="mt-3 text-sm text-critical">{apiError.userMessage}</p>}
    </Modal>
  )
}

function PolicyFields({
  initial,
  showPremium,
  onChange,
}: {
  initial: VehicleInsurance
  showPremium: boolean
  onChange: (values: VehicleInsurance) => void
}) {
  const [values, setValues] = useState<VehicleInsurance>(initial)

  const set = (key: keyof VehicleInsurance, value: string | number | undefined) => {
    const next = { ...values, [key]: value }
    setValues(next)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Provider">
        {(props) => (
          <TextInput
            {...props}
            autoFocus
            value={values.provider ?? ''}
            onChange={(e) => set('provider', e.target.value)}
          />
        )}
      </Field>

      <Field label="Policy number">
        {(props) => (
          <TextInput
            {...props}
            value={values.policyNumber ?? ''}
            onChange={(e) => set('policyNumber', e.target.value)}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          {(props) => (
            <TextInput
              {...props}
              type="date"
              value={values.startDate?.slice(0, 10) ?? ''}
              onChange={(e) => set('startDate', e.target.value || undefined)}
            />
          )}
        </Field>
        <Field label="End date">
          {(props) => (
            <TextInput
              {...props}
              type="date"
              value={values.endDate?.slice(0, 10) ?? ''}
              onChange={(e) => set('endDate', e.target.value || undefined)}
            />
          )}
        </Field>
      </div>

      {showPremium && (
        <Field label="Premium">
          {(props) => (
            <TextInput
              {...props}
              type="number"
              inputMode="numeric"
              min={0}
              value={values.premium ?? ''}
              onChange={(e) => set('premium', e.target.value ? Number(e.target.value) : undefined)}
            />
          )}
        </Field>
      )}
    </div>
  )
}
