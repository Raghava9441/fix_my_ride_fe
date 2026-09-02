import { Button, Modal, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { useUpdateVehicle } from '../api'
import type { Vehicle } from '../types'
import { VehicleForm } from './VehicleForm'

interface EditVehicleDialogProps {
  vehicle: Vehicle
  open: boolean
  onClose: () => void
}

export function EditVehicleDialog({ vehicle, open, onClose }: EditVehicleDialogProps) {
  const toast = useToast()
  const updateVehicle = useUpdateVehicle(vehicle._id)
  const apiError = asApiError(updateVehicle.error)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit vehicle"
      description={vehicle.registrationNumber}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={updateVehicle.isPending}>
            Cancel
          </Button>
          {/* Submits the form by id rather than lifting a ref out of it, so
              the form keeps ownership of its own validation and focus. */}
          <Button size="sm" type="submit" form="edit-vehicle-form" loading={updateVehicle.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      {/*
        Keyed on the vehicle's `updatedAt` so the form re-initialises when the
        underlying record changes — without it, reopening the dialog after an
        edit elsewhere would show the values from the first time it mounted.
      */}
      <VehicleForm
        key={vehicle.updatedAt}
        id="edit-vehicle-form"
        vehicle={vehicle}
        submitting={updateVehicle.isPending}
        serverErrors={apiError?.fieldErrors}
        onSubmit={(values) =>
          updateVehicle.mutate(values, {
            onSuccess: () => {
              toast.success('Vehicle updated')
              onClose()
            },
          })
        }
      />

      {apiError && apiError.fieldErrors.length === 0 && (
        <p className="mt-3 text-sm text-critical">{apiError.userMessage}</p>
      )}
    </Modal>
  )
}
