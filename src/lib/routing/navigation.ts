import { useMemo } from 'react'
import { useAccess } from '../access/AccessProvider'
import type { AccessContext } from '../access/policy'
import { evaluate } from '../access/policy'
import { routeIndex } from './router'
import { NAV_SECTIONS, type IconComponent, type NavSectionId } from './types'

/**
 * Builds the primary navigation from the route index.
 *
 * There is no navigation config file. A nav item exists because a route
 * declared `nav`, and it is visible because that route's *effective* access
 * rule — the same one its guard evaluates — allows this principal. A nav
 * item that leads to a 403 is therefore not a bug we have to remember not
 * to write; it's unrepresentable.
 *
 * Sections that end up empty for a principal disappear entirely, which is
 * what keeps an owner's nav from being a list of headings over nothing.
 */

export interface NavItem {
  id: string
  path: string
  label: string
  icon: IconComponent
  order: number
}

export interface NavSection {
  id: NavSectionId
  label: string
  items: NavItem[]
}

export function buildNavigation(ctx: AccessContext): NavSection[] {
  const bySection = new Map<NavSectionId, NavItem[]>()

  for (const entry of routeIndex.values()) {
    if (!entry.nav || !entry.path) continue
    if (entry.nav.hidden) continue
    if (!evaluate(entry.access, ctx).allowed) continue

    const items = bySection.get(entry.nav.section) ?? []
    items.push({
      id: entry.id,
      path: entry.path,
      label: entry.nav.label,
      icon: entry.nav.icon,
      order: entry.nav.order,
    })
    bySection.set(entry.nav.section, items)
  }

  return NAV_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: (bySection.get(section.id) ?? []).sort((a, b) => a.order - b.order),
  })).filter((section) => section.items.length > 0)
}

export function useNavigation(): NavSection[] {
  const { session, capabilities, isFlagEnabled } = useAccess()
  return useMemo(
    () => buildNavigation({ session, capabilities, isFlagEnabled }),
    [session, capabilities, isFlagEnabled],
  )
}

/**
 * Every route this principal may open, for the command palette. Routes
 * without a `title` (layouts, index routes) and the catch-all are excluded.
 */
/** The manifest id of the layout route that wraps every in-app screen. */
const APP_LAYOUT_ROUTE_ID = 'app'

export interface CommandTarget {
  id: string
  path: string
  title: string
  section?: NavSectionId
  keywords: string[]
}

export function useCommandTargets(): CommandTarget[] {
  const { session, capabilities, isFlagEnabled } = useAccess()

  return useMemo(() => {
    const ctx: AccessContext = { session, capabilities, isFlagEnabled }
    const targets: CommandTarget[] = []

    for (const entry of routeIndex.values()) {
      if (!entry.path || !entry.title) continue
      // Skip parameterised routes and the catch-all: neither is navigable
      // without data the palette doesn't have.
      if (entry.path.includes(':') || entry.path.includes('*')) continue
      // Only screens inside the app shell. Password reset and invitation
      // acceptance are `public`, so they pass the access check, but they're
      // emailed-link destinations — offering them mid-session is noise.
      if (!entry.ancestors.includes(APP_LAYOUT_ROUTE_ID)) continue
      if (!evaluate(entry.access, ctx).allowed) continue

      targets.push({
        id: entry.id,
        path: entry.path,
        title: entry.title,
        section: entry.nav?.section,
        keywords: entry.keywords ?? [],
      })
    }

    return targets
  }, [session, capabilities, isFlagEnabled])
}
