import type { BaseDocument, Id, IsoDate, ListParams, Ref } from '@/lib/api/domain'

export type EmploymentStatus = 'active' | 'on_leave' | 'suspended' | 'terminated'
export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern'

export interface StaffSkill {
  name?: string
  level?: 'beginner' | 'intermediate' | 'expert'
  certified?: boolean
  certificationExpiry?: IsoDate
  yearsOfExperience?: number
}

export interface WorkSchedule {
  [day: string]: { start?: string; end?: string; available?: boolean }
}

export interface PermissionGrant {
  _id?: Id
  permission?: Id
  grantedBy?: Id
  grantedAt: IsoDate
  expiresAt?: IsoDate
  reason?: string
}

export interface PermissionDenial {
  _id?: Id
  permission?: Id
  deniedBy?: Id
  deniedAt: IsoDate
  expiresAt?: IsoDate
  reason?: string
}

export interface StaffStats {
  totalServicesPerformed: number
  totalRevenueGenerated: number
  customerSatisfaction: number
}

export interface StaffProfile extends BaseDocument {
  accountId: Ref<{ _id: Id; email?: string }>
  serviceCenterId: Ref<{ _id: Id; name?: string }>
  employeeId?: string
  roleId: Ref<{ _id: Id; name?: string; slug?: string }>
  customPermissions?: PermissionGrant[]
  deniedPermissions?: PermissionDenial[]
  employmentStatus: EmploymentStatus
  employmentType: EmploymentType
  joinedAt: IsoDate
  leftAt?: IsoDate
  workSchedule?: WorkSchedule
  skills?: StaffSkill[]
  specializations?: string[]
  averageRating?: number
  totalReviews?: number
  stats?: StaffStats
}

export interface StaffListFilters extends ListParams {
  serviceCenterId?: Id
  roleId?: Id
  employmentStatus?: EmploymentStatus
  employmentType?: EmploymentType
  [key: string]: string | number | boolean | undefined
}

export interface CreateStaffInput {
  accountId?: Id
  email?: string
  serviceCenterId: Id
  roleId: Id
  employeeId?: string
  employmentType?: EmploymentType
  joinedAt?: IsoDate
}

export type UpdateStaffInput = Partial<CreateStaffInput> & {
  employmentStatus?: EmploymentStatus
  specializations?: string[]
  skills?: StaffSkill[]
}

export interface GrantPermissionInput {
  permission: string
  expiresAt?: IsoDate
  reason?: string
}

export interface StaffPerformance {
  totalServices?: number
  averageRating?: number
  revenueGenerated?: number
  [key: string]: unknown
}
