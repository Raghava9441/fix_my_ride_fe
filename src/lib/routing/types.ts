import type { ComponentType, ReactNode, SVGProps } from 'react'
import type { AccessRule } from '../access/policy'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

/**
 * Top-level groupings in the primary navigation. Ordered here; the nav
 * renders sections in this order and hides any that end up empty for the
 * current principal.
 */
export const NAV_SECTIONS = [
  { id: 'overview', label: '' },
  { id: 'operations', label: 'Operations' },
  { id: 'people', label: 'People' },
  { id: 'business', label: 'Business' },
  { id: 'administration', label: 'Administration' },
] as const

export type NavSectionId = (typeof NAV_SECTIONS)[number]['id']

export interface NavMeta {
  label: string
  icon: IconComponent
  section: NavSectionId
  /** Ascending within a section. Leave gaps — inserting later is cheaper. */
  order: number
  /** Render as a nav item but keep it out of the command palette. */
  hidden?: boolean
}

/**
 * A node in the route manifest.
 *
 * One declaration carries everything four subsystems need — the router, the
 * navigation, the breadcrumb trail, and the command palette — so they cannot
 * disagree about whether a screen exists or who may see it.
 */
export interface AppRoute {
  /** Stable identity. Survives URL changes; used for preloading and lookups. */
  id: string

  /**
   * Absolute path from `ROUTE_PATHS`. Omitted for layout routes, which are
   * pathless and exist only to wrap children in chrome or a guard.
   */
  path?: string

  /** Matches the parent's path exactly. At most one per children array. */
  index?: boolean

  /**
   * Lazily-imported screen. Everything below the shell is code-split by
   * default — a technician who never opens Billing should never download it.
   */
  component?: () => Promise<{ default: ComponentType }>

  /** Eagerly-rendered element, for layout routes only. */
  element?: ReactNode

  /**
   * Who may reach this route. Omitted means "inherit the parent's rule".
   * A declared rule is ANDed with every ancestor rule rather than replacing
   * them, so a child can only ever narrow access, never widen it — you
   * cannot accidentally expose a screen by nesting it somewhere permissive.
   */
  access?: AccessRule

  /** Document title and default breadcrumb label. */
  title?: string

  /**
   * Breadcrumb label when it should differ from `title`, or `false` to keep
   * this route out of the trail (layout and index routes usually are).
   */
  breadcrumb?: string | false

  /** Present ⇒ appears in the primary navigation. */
  nav?: NavMeta

  /** Extra terms the command palette should match on. */
  keywords?: string[]

  children?: AppRoute[]
}

/**
 * What `useMatches()` hands back per matched route. React Router only
 * carries `handle` through, so everything the shell needs at render time
 * has to be packed into it when the manifest is compiled.
 */
export interface RouteHandle {
  id: string
  title?: string
  breadcrumb?: string | false
  nav?: NavMeta
  /** The *effective* rule — this route's own, ANDed with all ancestors'. */
  access: AccessRule
  path?: string
}
