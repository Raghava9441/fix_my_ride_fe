import type { BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'

export type InvitationType = 'vehicle_access' | 'center_staff' | 'ownership_transfer' | 'collaborator'

export type InvitationRole =
  | 'owner'
  | 'technician'
  | 'manager'
  | 'receptionist'
  | 'accountant'
  | 'viewer'
  | 'admin'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'maxed_out'

export interface Invitation extends BaseDocument {
  tenantId?: Id
  inviterId: Id
  inviterType: 'OwnerProfile' | 'StaffProfile' | 'Account' | 'ServiceCenter'
  inviterName?: string
  inviteeEmail?: string
  inviteePhone?: string
  inviteeName?: string
  invitationType: InvitationType
  vehicleId?: Id
  serviceCenterId?: Id
  role: InvitationRole
  accessLevel: 'full' | 'readonly' | 'limited'
  permissions?: string[]
  maxUses: number
  useCount: number
  expiresAt: IsoDate
  status: InvitationStatus
  acceptedAt?: IsoDate
  revokedAt?: IsoDate
  revokedReason?: string
  message?: string
  sentAt?: IsoDate
  reminderCount?: number
  /*
   * `token` is deliberately absent. It is the bearer credential in the
   * invitation link, and the client only ever handles it as an opaque URL
   * parameter on the accept screen — never as a field to render or store.
   */
}

export interface InvitationListFilters extends ListParams {
  status?: InvitationStatus
  invitationType?: InvitationType
  serviceCenterId?: Id
  [key: string]: string | number | boolean | undefined
}

export interface CreateInvitationInput {
  inviteeEmail?: string
  inviteePhone?: string
  inviteeName?: string
  invitationType: InvitationType
  role: InvitationRole
  accessLevel?: 'full' | 'readonly' | 'limited'
  vehicleId?: Id
  serviceCenterId?: Id
  permissions?: string[]
  message?: string
  expiresAt?: IsoDate
  maxUses?: number
}

export type UpdateInvitationInput = Partial<CreateInvitationInput>

/** What `GET /invitations/validate?token=` returns before the user signs in. */
export interface InvitationPreview {
  valid: boolean
  inviterName?: string
  inviteeEmail?: string
  invitationType?: InvitationType
  role?: InvitationRole
  expiresAt?: IsoDate
  serviceCenterName?: string
}
