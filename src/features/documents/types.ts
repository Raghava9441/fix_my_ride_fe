import type { BaseDocument, Id, IsoDate, ListParams } from '@/lib/api/domain'

export type DocumentEntityType =
  | 'vehicle'
  | 'service_record'
  | 'service_center'
  | 'owner_profile'
  | 'staff_profile'
  | 'invoice'
  | 'subscription'
  | 'audit'
  | 'other'

export type DocumentType =
  | 'registration'
  | 'insurance'
  | 'puc'
  | 'invoice'
  | 'warranty'
  | 'service_history'
  | 'photo'
  | 'video'
  | 'report'
  | 'contract'
  | 'id_proof'
  | 'certificate'
  | 'other'

export type DocumentStatus = 'active' | 'archived' | 'deleted' | 'processing' | 'failed'

export interface Document extends BaseDocument {
  tenantId?: Id
  accountId?: Id
  originalName: string
  fileName: string
  mimeType: string
  size: number
  extension: string
  storageProvider: 's3' | 'cloudinary' | 'local' | 'gcs' | 'azure'
  url: string
  thumbnailUrl?: string
  downloadUrl?: string
  entityType: DocumentEntityType
  entityId: Id
  documentType: DocumentType
  description?: string
  tags?: string[]
  isVerified: boolean
  verifiedBy?: Id
  verifiedAt?: IsoDate
  isPublic: boolean
  validFrom?: IsoDate
  validUntil?: IsoDate
  isExpired: boolean
  status: DocumentStatus
  version: number
  isLatestVersion: boolean
}

export interface DocumentListFilters extends ListParams {
  entityType?: DocumentEntityType
  entityId?: Id
  documentType?: DocumentType
  status?: DocumentStatus
  isVerified?: boolean
  [key: string]: string | number | boolean | undefined
}
