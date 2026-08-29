import type { AccountRole, RbacRole } from '../access/roles'
import type { PermissionKey } from '../access/permissions'

/**
 * The client's view of the signed-in principal.
 *
 * Assembled from `GET /api/v1/auth/me`, which returns the API's `Account`
 * document. Every field beyond `id`/`email`/`roles` is optional because the
 * account shape varies by principal type — an owner has an `ownerProfileId`
 * and no `staffProfileId`, a platform admin has neither.
 *
 * Note what is *not* here: the access token's claims. The token carries
 * `userId`, `email`, `role`, `roles`, `tenantId`, `sessionVersion`,
 * `mfaVerified` and no permissions at all, so decoding it client-side would
 * tell us strictly less than this endpoint does. The token is for the
 * `Authorization` header; this is for the UI.
 */
export interface SessionUser {
  id: string
  email: string
  name?: string
  /** Coarse role used by the API's `requireRole(...)` guards. */
  primaryRole: AccountRole
  roles: AccountRole[]
  tenantId: string | null
  ownerProfileId: string | null
  staffProfileId: string | null
  /**
   * Fine-grained role from the `Role` collection, when a staff profile
   * resolves one. Absent for owners and admins.
   */
  rbacRole: RbacRole | null
  /**
   * Server-issued effective permissions. Always null today — the API
   * issues no `permissions` claim and exposes no endpoint for the resolved
   * set. When it does, populating this switches `deriveCapabilities()`
   * from inference to fact with no other change.
   */
  permissions: PermissionKey[] | null
  mfaEnabled: boolean
  status: string | null
}

export type SessionStatus =
  /** Nothing attempted yet — before `bootstrap()` runs. */
  | 'idle'
  /** A session restore or sign-in is in flight. Guards must wait, not redirect. */
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'

/** Shape of `GET /auth/me`, defensively typed — the API returns the raw Account. */
export interface MeResponse {
  _id?: string
  id?: string
  email: string
  firstName?: string
  lastName?: string
  name?: string
  /** `/auth/login` returns the coarse role as `role`; `/auth/me` as `primaryRole`. */
  role?: string
  primaryRole?: string
  roles?: string[]
  tenantId?: string | { _id: string } | null
  ownerProfileId?: string | null
  /** A bare id, or the populated profile with its `roleId` when expanded. */
  staffProfileId?: string | { roleId?: { slug?: string } } | null
  permissions?: string[] | null
  mfaEnabled?: boolean
  status?: string
}

export interface LoginResponse {
  user?: MeResponse
  account?: MeResponse
  accessToken: string
  refreshToken: string
  expiresIn?: number
  /** Present when the account has MFA enabled and must complete the challenge. */
  mfaRequired?: boolean
}
