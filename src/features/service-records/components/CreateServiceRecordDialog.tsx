import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Field,
  Modal,
  SelectInput,
  TextArea,
  TextInput,
  useToast,
} from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { to } from '@/lib/routing'
import { useVehicles } from '@/features/vehicles/api'
import { useCreateServiceRecord } from '../api'
import type { ServiceType } from '../types'

const TYPES: { value: ServiceType; label: string }[] = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'oil_change', label: 'Oil change' },
  { value: 'brake_service', label: 'Brake service' },
  { value: 'tire_rotation', label: 'Tire rotation' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
]

interface Props {
  open: boolean
  onClose: () => void
  /** Pre-selects the vehicle when opened from a vehicle's own page. */
  vehicleId?: string
}

/**
 * Books a job in.
 *
 * The vehicle is a real picker rather than an id field — unlike owners, there
 * *is* a vehicle list endpoint, so making someone paste an ObjectId here would
 * be a choice rather than a constraint. It also carries the odometer forward
 * from the selected vehicle, which is the number a service advisor would
 * otherwise copy by hand from the previous screen.
 */
export function CreateServiceRecordDialog({ open, onClose, vehicleId }: Props) {
  const toast = useToast()
  const navigate = useNavigate()
  const createRecord = useCreateServiceRecord()

  const { data: vehiclePage, isLoading: vehiclesLoading } = useVehicles({ limit: 100 })

  const [values, setValues] = useState({
    vehicleId: vehicleId ?? '',
    serviceType: 'maintenance' as ServiceType,
    serviceDate: new Date().toISOString().slice(0, 10),
    odometer: 0,
    odometerUnit: 'km' as 'km' | 'miles',
    description: '',
  })
  const [touched, setTouched] = useState(false)

  const apiError = asApiError(createRecord.error)
  const vehicles = vehiclePage?.items ?? []

  const errors = {
    vehicleId: values.vehicleId ? undefined : 'Choose a vehicle.',
    description: values.description.trim() ? undefined : 'Describe the work.',
    odometer: values.odometer >= 0 ? undefined : 'Odometer cannot be negative.',
  }
  const invalid = Object.values(errors).some(Boolean)

  const selectVehicle = (id: string) => {
    const vehicle = vehicles.find((v) => v._id === id)
    setValues((prev) => ({
      ...prev,
      vehicleId: id,
      // Carry the vehicle's current reading forward; it's almost always the
      // right starting point and is otherwise retyped from memory.
      odometer: vehicle?.currentOdometer?.value ?? prev.odometer,
      odometerUnit: vehicle?.currentOdometer?.unit ?? prev.odometerUnit,
    }))
  }

  const submit = () => {
    setTouched(true)
    if (invalid) return

    createRecord.mutate(
      {
        vehicleId: values.vehicleId,
        /*
         * `serviceCenterId`, `ownerId` and `createdBy` are deliberately not
         * sent. The server derives the centre from the caller's staff profile
         * (falling back to the vehicle's primary authorised centre), the owner
         * from the vehicle, and the creator from the session — none of which
         * the browser can know, and the last of which it should not be
         * trusted to assert.
         */
        serviceType: values.serviceType,
        serviceDate: new Date(values.serviceDate).toISOString(),
        odometerReading: { value: values.odometer, unit: values.odometerUnit },
        description: values.description.trim(),
        status: 'scheduled',
      },
      {
        onSuccess: (record) => {
          toast.success('Job logged')
          onClose()
          navigate(to.serviceRecordDetail(record._id))
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a job"
      description="Book work in against a vehicle."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={createRecord.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={createRecord.isPending}>
            Log job
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Vehicle" required error={touched ? errors.vehicleId : undefined}>
          {(props) => (
            <SelectInput
              {...props}
              value={values.vehicleId}
              onChange={(e) => selectVehicle(e.target.value)}
              disabled={Boolean(vehicleId) || vehiclesLoading}
            >
              <option value="">{vehiclesLoading ? 'Loading…' : 'Choose a vehicle'}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.registrationNumber} · {vehicle.make} {vehicle.model}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Service type" required>
            {(props) => (
              <SelectInput
                {...props}
                value={values.serviceType}
                onChange={(e) =>
                  setValues((v) => ({ ...v, serviceType: e.target.value as ServiceType }))
                }
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field label="Service date" required>
            {(props) => (
              <TextInput
                {...props}
                type="date"
                value={values.serviceDate}
                onChange={(e) => setValues((v) => ({ ...v, serviceDate: e.target.value }))}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Odometer at intake" error={touched ? errors.odometer : undefined}>
            {(props) => (
              <TextInput
                {...props}
                type="number"
                inputMode="numeric"
                min={0}
                value={values.odometer}
                onChange={(e) => setValues((v) => ({ ...v, odometer: Number(e.target.value) }))}
              />
            )}
          </Field>

          <Field label="Unit">
            {(props) => (
              <SelectInput
                {...props}
                value={values.odometerUnit}
                onChange={(e) =>
                  setValues((v) => ({ ...v, odometerUnit: e.target.value as 'km' | 'miles' }))
                }
              >
                <option value="km">km</option>
                <option value="miles">miles</option>
              </SelectInput>
            )}
          </Field>
        </div>

        <Field label="Description" required error={touched ? errors.description : undefined}>
          {(props) => (
            <TextArea
              {...props}
              rows={3}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Customer reports a rattle under braking"
            />
          )}
        </Field>

        {apiError && <p className="text-sm text-critical">{apiError.userMessage}</p>}
      </div>
    </Modal>
  )
}
