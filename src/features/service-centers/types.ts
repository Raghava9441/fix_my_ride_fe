import type { Address, BaseDocument, GeoPoint, Id, IsoDate, ListParams } from '@/lib/api/domain'

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'

export interface BusinessHours {
  [day: string]: { open?: string; close?: string; closed?: boolean }
}

export interface OfferedService {
  _id?: Id
  name?: string
  category?: string
  /** Minutes. */
  duration?: number
  basePrice?: number
  isActive: boolean
}

export interface ServiceCenterStats {
  totalVehiclesServed: number
  activeVehicles: number
  totalServiceRecords: number
  averageRating: number
  totalRevenue: number
}

export interface ServiceCenterSettings {
  currency: string
  timezone: string
  businessHours: BusinessHours
}

export interface ServiceCenter extends BaseDocument {
  tenantId?: Id
  name: string
  slug?: string
  businessRegistrationNumber: string
  email: string
  phone: string
  website?: string
  address: Address & { coordinates?: GeoPoint }
  subscription?: {
    planId: Id
    status: SubscriptionStatus
    startedAt: IsoDate
    expiresAt?: IsoDate
    trialEndsAt?: IsoDate
  }
  settings?: ServiceCenterSettings
  servicesOffered?: OfferedService[]
  stats?: ServiceCenterStats
  createdBy?: Id
}

export interface ServiceCenterReview extends BaseDocument {
  serviceCenterId: Id
  accountId?: Id
  rating: number
  comment?: string
  authorName?: string
}

export interface ServiceCenterListFilters extends ListParams {
  city?: string
  country?: string
  status?: SubscriptionStatus
  [key: string]: string | number | boolean | undefined
}

/** `/service-centers/nearby` — a geo query, so it takes coordinates. */
export interface NearbyFilters {
  lat: number
  lng: number
  /** Kilometres. */
  radius?: number
  limit?: number
  [key: string]: string | number | boolean | undefined
}

export interface CreateServiceCenterInput {
  name: string
  businessRegistrationNumber: string
  email: string
  phone: string
  website?: string
  address: Address
}

export type UpdateServiceCenterInput = Partial<CreateServiceCenterInput>

export interface CreateReviewInput {
  rating: number
  comment?: string
}
