/**
 * Query key factory.
 *
 * Keys are hierarchical arrays so invalidation can target a level:
 *
 *   queryKeys.vehicles.all          ['vehicles']                  → everything
 *   queryKeys.vehicles.lists()      ['vehicles','list']           → every list/filter
 *   queryKeys.vehicles.list({q})    ['vehicles','list',{q}]       → one filter
 *   queryKeys.vehicles.detail(id)   ['vehicles','detail',id]      → one record
 *
 * Centralising them is what keeps invalidation correct as the surface grows.
 * Hand-written keys drift — one file writes `['vehicles']` and another
 * `['vehicle']`, and an invalidation silently matches nothing. That failure
 * is invisible: no error, just stale data on screen.
 *
 * `as const` throughout so keys are literal tuples and a typo in a level name
 * is a compile error.
 */

import type { QueryParams } from './types'

export const queryKeys = {
  session: {
    all: ['session'] as const,
    me: () => [...queryKeys.session.all, 'me'] as const,
  },

  vehicles: {
    all: ['vehicles'] as const,
    lists: () => [...queryKeys.vehicles.all, 'list'] as const,
    list: (filters: QueryParams = {}) => [...queryKeys.vehicles.lists(), filters] as const,
    details: () => [...queryKeys.vehicles.all, 'detail'] as const,
    detail: (vehicleId: string) => [...queryKeys.vehicles.details(), vehicleId] as const,
    serviceRecords: (vehicleId: string) => [...queryKeys.vehicles.detail(vehicleId), 'service-records'] as const,
    documents: (vehicleId: string) => [...queryKeys.vehicles.detail(vehicleId), 'documents'] as const,
    reminders: (vehicleId: string) => [...queryKeys.vehicles.detail(vehicleId), 'reminders'] as const,
  },

  serviceRecords: {
    all: ['service-records'] as const,
    lists: () => [...queryKeys.serviceRecords.all, 'list'] as const,
    list: (filters: QueryParams = {}) => [...queryKeys.serviceRecords.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.serviceRecords.all, 'detail', id] as const,
  },

  reminders: {
    all: ['reminders'] as const,
    upcoming: () => [...queryKeys.reminders.all, 'upcoming'] as const,
    overdue: () => [...queryKeys.reminders.all, 'overdue'] as const,
  },

  serviceCenters: {
    all: ['service-centers'] as const,
    lists: () => [...queryKeys.serviceCenters.all, 'list'] as const,
    list: (filters: QueryParams = {}) => [...queryKeys.serviceCenters.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.serviceCenters.all, 'detail', id] as const,
  },

  staff: {
    all: ['staff'] as const,
    lists: () => [...queryKeys.staff.all, 'list'] as const,
    list: (filters: QueryParams = {}) => [...queryKeys.staff.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.staff.all, 'detail', id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
} as const
