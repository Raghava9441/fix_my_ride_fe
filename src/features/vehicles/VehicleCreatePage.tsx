import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Card, CardBody, CardFooter, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, to } from '@/lib/routing'
import { useCreateVehicle } from './api'
import { VehicleForm } from './components/VehicleForm'

export default function VehicleCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const createVehicle = useCreateVehicle()

  const apiError = asApiError(createVehicle.error)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="Add vehicle"
        description="Register a vehicle so it can be serviced and tracked."
        backTo={ROUTE_PATHS.vehicles}
      />

      <Card>
        <CardBody>
          <VehicleForm
            submitting={createVehicle.isPending}
            // The API's field errors land back on the fields that caused
            // them — a duplicate registration should mark that input, not
            // show a banner the user has to map onto a field themselves.
            serverErrors={apiError?.fieldErrors}
            onSubmit={(values) =>
              createVehicle.mutate(values, {
                onSuccess: (vehicle) => {
                  toast.success('Vehicle added', vehicle.registrationNumber)
                  // Straight to the new record rather than back to the list:
                  // the next thing you do after adding a vehicle is almost
                  // always something *to* it.
                  navigate(to.vehicleDetail(vehicle._id), { replace: true })
                },
              })
            }
            footer={({ submit }) => (
              <CardFooter className="-mx-4 -mb-4 mt-2">
                <Button variant="secondary" onClick={() => navigate(ROUTE_PATHS.vehicles)} type="button">
                  Cancel
                </Button>
                <Button onClick={submit} type="button" loading={createVehicle.isPending}>
                  Add vehicle
                </Button>
              </CardFooter>
            )}
          />

          {/* Anything that isn't a field error — a network failure, a 500 —
              has no field to attach to, so it surfaces here. */}
          {apiError && apiError.fieldErrors.length === 0 && (
            <p className="mt-3 text-sm text-critical">{apiError.userMessage}</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
