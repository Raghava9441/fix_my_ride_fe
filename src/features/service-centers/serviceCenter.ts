import type { Address } from '@/lib/api/domain'
import type { Tone } from '@/components/ui'
import type { ServiceCenter, SubscriptionStatus } from './types'

/**
 * Presentation helpers for a service center.
 *
 * ---- Status ----
 *
 * A center has no `status` of its own; what the API exposes is the state of
 * its *subscription*. That is shown as-is rather than relabelled "active /
 * inactive", because a lapsed subscription and a suspended one call for
 * different responses and collapsing them would hide which.
 */
export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  trial: { label: 'Trial', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  expired: { label: 'Expired', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'critical' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const SUBSCRIPTION_STATUS_ORDER: SubscriptionStatus[] = [
  'active',
  'trial',
  'expired',
  'suspended',
  'cancelled',
]

/** Monday-first, matching the staff rota. */
export const BUSINESS_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export function dayLabel(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1)
}

/** `Street, City, State, Postcode, Country` with the gaps closed up. */
export function formatAddress(address: Address | undefined, short = false): string | undefined {
  if (!address) return undefined
  const parts = short
    ? [address.city, address.state]
    : [address.street, address.city, address.state, address.postalCode, address.country]
  const text = parts.filter(Boolean).join(', ')
  return text || undefined
}

export function centerStatus(center: ServiceCenter): { label: string; tone: Tone } | undefined {
  const status = center.subscription?.status
  return status ? SUBSCRIPTION_STATUS[status] : undefined
}

/** An http(s) href for a free-text website, or undefined if it can't be made into one. */
export function safeWebsite(website: string | undefined): string | undefined {
  if (!website) return undefined
  const href = /^https?:\/\//i.test(website) ? website : `https://${website}`
  try {
    const url = new URL(href)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

export const COMMON_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD']
