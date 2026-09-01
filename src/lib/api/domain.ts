/**
 * Primitives shared across every feature's domain types.
 *
 * These exist because the same three or four shapes recur in almost every
 * model the API returns, and re-declaring them per feature is how they drift
 * apart — one feature spelling `postalCode` and another `zipCode` for the
 * same field on the wire.
 */

/** A MongoDB ObjectId as it arrives over the wire. */
export type Id = string

/** An ISO-8601 timestamp. Kept as a string — parsing belongs at the edge. */
export type IsoDate = string

/**
 * A Mongoose reference, which arrives either as a bare id or as the populated
 * document depending on whether the endpoint called `.populate()`.
 *
 * Modelling it honestly as a union forces call sites to handle both, which is
 * better than typing it as the populated shape and getting `undefined` at
 * runtime on the endpoints that don't populate.
 */
export type Ref<T> = Id | T

/** Narrows a `Ref` to the populated document, when it is one. */
export function isPopulated<T>(ref: Ref<T> | null | undefined): ref is T {
  return typeof ref === 'object' && ref !== null
}

/** Reads the id out of a `Ref` regardless of which form it took. */
export function refId<T extends { _id: Id }>(ref: Ref<T> | null | undefined): Id | null {
  if (!ref) return null
  return typeof ref === 'string' ? ref : ref._id
}

export interface Address {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface GeoPoint {
  type: string
  coordinates: number[]
}

/** Every soft-deletable, timestamped document the API returns. */
export interface BaseDocument {
  _id: Id
  createdAt: IsoDate
  updatedAt: IsoDate
  isDeleted?: boolean
}

/** Query parameters every list endpoint accepts. */
export interface ListParams {
  page?: number
  limit?: number
  sort?: string
  q?: string
}
