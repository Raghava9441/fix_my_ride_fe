export interface Vehicle {
  _id: string
  registrationNumber: string
  make: string
  model: string
  year: number
  fuelType: string
  color?: string
  currentOdometer?: {
    value: number
    unit: string
  }
  serviceSchedule?: {
    nextServiceDueDate?: string
  }
}

/**
 * Query parameters the list endpoint accepts.
 *
 * Typed rather than `Record<string, unknown>` so a filter that the backend
 * ignores is a compile error instead of a silently-dropped parameter — and
 * so the object can be used directly as part of a query key without smuggling
 * unstable values into it.
 */
export interface VehicleListFilters {
  page?: number
  limit?: number
  /** Free-text search across registration, make, and model. */
  q?: string
  make?: string
  fuelType?: string
  serviceCenterId?: string
  currentOwnerId?: string
  sort?: 'createdAt' | '-createdAt' | 'registrationNumber' | 'year' | '-year'
  [key: string]: string | number | boolean | undefined
}

export interface CreateVehicleInput {
  registrationNumber: string
  make: string
  model: string
  year: number
  fuelType: string
  color?: string
  currentOdometer?: { value: number; unit: string }
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>
