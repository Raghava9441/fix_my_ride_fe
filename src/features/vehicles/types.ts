import type { Address, BaseDocument, Id, IsoDate, ListParams, Ref } from '@/lib/api/domain'

export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'cng' | 'lpg'
export type Transmission = 'manual' | 'automatic' | 'cvt'
export type AccessLevel = 'full' | 'readonly' | 'limited'

export interface OdometerValue {
  value: number
  unit: 'km' | 'miles'
  recordedAt?: IsoDate
  recordedBy?: Id
}

/** The subset of a service center the vehicle endpoints populate. */
export interface ServiceCenterSummary {
  _id: Id
  name?: string
  email?: string
  phone?: string
  address?: Address
}

export interface AuthorizedServiceCenter {
  /**
   * Populated by `GET /vehicles/:id/service-centers`, a bare id elsewhere.
   * Typed as the union rather than the convenient half: declaring it a string
   * crashed the overview tab, which rendered the object straight into JSX.
   */
  serviceCenterId: Ref<ServiceCenterSummary>
  authorizedBy?: Id
  authorizedAt: IsoDate
  accessLevel: AccessLevel
  status: 'active' | 'revoked' | 'expired'
  isPrimary: boolean
  revokedAt?: IsoDate
}

export interface ServiceSchedule {
  lastServiceDate?: IsoDate
  lastServiceOdometer?: number
  nextServiceDueDate?: IsoDate
  nextServiceDueOdometer?: number
}

export interface Vehicle extends BaseDocument {
  tenantId?: Id
  registrationNumber: string
  vin?: string
  make: string
  /** Shadowed on the server by `Omit<Document, 'model'>` — it is the trim name. */
  model: string
  year: number
  fuelType: FuelType
  transmission?: Transmission
  color?: string
  currentOwnerId: Ref<{ _id: Id; firstName?: string; lastName?: string }>
  ownershipHistory?: Array<{
    ownerId?: Id
    fromDate?: IsoDate
    toDate?: IsoDate
    transferReason?: string
  }>
  authorizedServiceCenters?: AuthorizedServiceCenter[]
  currentOdometer?: OdometerValue
  serviceSchedule?: ServiceSchedule
}

export interface OdometerReading extends BaseDocument {
  vehicleId: Id
  value: number
  unit: 'km' | 'miles'
  recordedAt: IsoDate
  recordedBy?: Id
  recordedByModel?: 'Account' | 'OwnerProfile' | 'StaffProfile' | 'System'
  source: 'manual_entry' | 'service_record' | 'import' | 'api' | 'obd_device'
  isVerified: boolean
  verifiedBy?: Id
  verifiedAt?: IsoDate
  notes?: string
}

export interface VehicleWarranty {
  provider?: string
  policyNumber?: string
  startDate?: IsoDate
  endDate?: IsoDate
  coverage?: string
  notes?: string
}

export interface VehicleInsurance {
  provider?: string
  policyNumber?: string
  startDate?: IsoDate
  endDate?: IsoDate
  premium?: number
  coverageType?: string
  notes?: string
}

/**
 * Shape returned by `GET /vehicles/:id/stats`.
 *
 * Field names taken from the endpoint itself. An earlier guess
 * (`totalServices` / `totalSpent`) type-checked and rendered a card of
 * em dashes, because none of those keys exist on the response.
 */
export interface VehicleStats {
  serviceCount?: number
  totalServiceCost?: number
  /** Null until there are at least two services to measure between. */
  averageServiceIntervalDays?: number | null
}

/**
 * Query parameters the list endpoint accepts.
 *
 * Typed rather than `Record<string, unknown>` so a filter the backend ignores
 * is a compile error instead of a silently-dropped parameter — and so the
 * object can go straight into a query key without smuggling unstable values
 * into it.
 */
export interface VehicleListFilters extends ListParams {
  make?: string
  fuelType?: FuelType
  serviceCenterId?: Id
  currentOwnerId?: Id
  [key: string]: string | number | boolean | undefined
}

export interface CreateVehicleInput {
  registrationNumber: string
  make: string
  model: string
  year: number
  fuelType: FuelType
  transmission?: Transmission
  color?: string
  vin?: string
  currentOwnerId?: Id
  currentOdometer?: { value: number; unit: 'km' | 'miles' }
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>

export interface AuthorizeServiceCenterInput {
  serviceCenterId: Id
  accessLevel?: AccessLevel
  isPrimary?: boolean
}

export interface RecordOdometerInput {
  value: number
  unit?: 'km' | 'miles'
  recordedAt?: IsoDate
  source?: OdometerReading['source']
  notes?: string
}

export interface TransferOwnershipInput {
  newOwnerId: Id
  transferReason?: string
  effectiveDate?: IsoDate
}

export interface VehicleAddress extends Address {}
