import type { BaseDocument, Id, IsoDate, ListParams, Ref } from '@/lib/api/domain'
import type { Vehicle } from '@/features/vehicles/types'

export type ServiceType =
  | 'oil_change'
  | 'brake_service'
  | 'tire_rotation'
  | 'repair'
  | 'maintenance'
  | 'inspection'
  | 'other'

export type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'waived'

export interface ServiceCost {
  partsTotal: number
  laborTotal: number
  subtotal: number
  tax: number
  discount: number
  total: number
  currency: string
  paymentStatus: PaymentStatus
  invoiceNumber?: string
}

export interface ServicePart {
  _id?: Id
  partName?: string
  partNumber?: string
  quantity?: number
  unitCost?: number
  totalCost?: number
  warrantyMonths?: number
}

export interface ServiceLabor {
  _id?: Id
  description?: string
  hours?: number
  rate?: number
  total?: number
  technicianId?: Id
}

export interface NextServiceRecommendation {
  recommendedDate?: IsoDate
  recommendedOdometer?: number
  serviceType?: string
}

export interface ServiceFeedback {
  rating?: number
  comment?: string
  submittedAt?: IsoDate
}

export interface ServiceRecord extends BaseDocument {
  tenantId?: Id
  vehicleId: Ref<Vehicle>
  serviceCenterId: Ref<{ _id: Id; name?: string }>
  technicianId?: Ref<{ _id: Id }>
  ownerId: Ref<{ _id: Id; firstName?: string; lastName?: string }>
  serviceDate: IsoDate
  serviceType: ServiceType
  odometerReading: { value: number; unit?: 'km' | 'miles' }
  description: string
  cost: ServiceCost
  partsReplaced?: ServicePart[]
  /**
   * Itemised labour behind `cost.laborTotal`, which the server re-derives
   * from these lines whenever one changes.
   */
  laborItems?: ServiceLabor[]
  feedback?: ServiceFeedback
  nextService?: NextServiceRecommendation
  status: ServiceStatus
  createdBy?: { accountId: Id; role: 'owner' | 'staff' }
}

export interface ServiceRecordListFilters extends ListParams {
  vehicleId?: Id
  serviceCenterId?: Id
  ownerId?: Id
  technicianId?: Id
  status?: ServiceStatus
  serviceType?: ServiceType
  from?: IsoDate
  to?: IsoDate
  [key: string]: string | number | boolean | undefined
}

export interface CreateServiceRecordInput {
  vehicleId: Id
  /*
   * All optional: the server resolves the centre from the caller's staff
   * profile (falling back to the vehicle's primary authorised centre), and the
   * owner from the vehicle. `createdBy` isn't here at all — it comes from the
   * session, and accepting it from a client would let a caller attribute work
   * to somebody else.
   */
  serviceCenterId?: Id
  ownerId?: Id
  technicianId?: Id
  serviceDate: IsoDate
  serviceType: ServiceType
  odometerReading: { value: number; unit?: 'km' | 'miles' }
  description: string
  status?: ServiceStatus
}

export type UpdateServiceRecordInput = Partial<CreateServiceRecordInput>
