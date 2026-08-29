import { Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import { access, type AccessRule } from '../access/policy'
import { RouteGuard } from './guards'
import { RouteFallback } from './RouteFallback'
import { lazyRoute, type LazyRouteComponent } from './lazyRoute'
import type { AppRoute, RouteHandle } from './types'

/**
 * Compiles the route manifest into React Router's route objects, and into a
 * flat index everything else in the app reads.
 *
 * The compile step is where the manifest stops being a nested tree and
 * becomes four things at once:
 *
 *   - `RouteObject[]` for the router
 *   - a `handle` per route, so `useMatches()` can produce breadcrumbs and
 *     document titles without a second lookup table
 *   - a flat `RouteIndex` keyed by route id, which the navigation, the
 *     command palette, and hover-preloading all read
 *   - the *effective* access rule per route: this route's own rule ANDed
 *     with every ancestor's
 *
 * That last point is the important one. Access composes downward and can
 * only narrow, so putting a screen inside the admin subtree makes it
 * admin-only whether or not its own declaration says so — you cannot widen
 * access by forgetting something.
 */

export interface RouteIndexEntry {
  id: string
  /** Absolute path, or undefined for pathless layout routes. */
  path?: string
  title?: string
  breadcrumb?: string | false
  nav?: AppRoute['nav']
  keywords?: string[]
  /** This route's rule ANDed with every ancestor's. */
  access: AccessRule
  /** Warms this route's chunk. Undefined for layout routes. */
  preload?: () => Promise<unknown>
  /** Ancestor ids, outermost first — used to build breadcrumb trails. */
  ancestors: string[]
}

export type RouteIndex = ReadonlyMap<string, RouteIndexEntry>

function composeAccess(inherited: AccessRule | null, own: AccessRule | undefined): AccessRule {
  if (!inherited) return own ?? access.public()
  if (!own) return inherited
  return access.all(inherited, own)
}

export function buildRoutes(manifest: AppRoute[]): { routes: RouteObject[]; index: RouteIndex } {
  const index = new Map<string, RouteIndexEntry>()

  function compile(route: AppRoute, inherited: AccessRule | null, ancestors: string[]): RouteObject {
    const effectiveAccess = composeAccess(inherited, route.access)

    if (index.has(route.id)) {
      throw new Error(`Duplicate route id "${route.id}" in the route manifest.`)
    }

    let lazyComponent: LazyRouteComponent | undefined
    if (route.component) lazyComponent = lazyRoute(route.component)

    index.set(route.id, {
      id: route.id,
      path: route.path,
      title: route.title,
      breadcrumb: route.breadcrumb,
      nav: route.nav,
      keywords: route.keywords,
      access: effectiveAccess,
      preload: lazyComponent?.preload,
      ancestors,
    })

    const handle: RouteHandle = {
      id: route.id,
      title: route.title,
      breadcrumb: route.breadcrumb,
      nav: route.nav,
      access: effectiveAccess,
      path: route.path,
    }

    // A layout route's own element renders the guard *outside* its chrome, so
    // a denied child never briefly paints the shell it isn't allowed to see.
    const inner = lazyComponent ? (
      <Suspense fallback={<RouteFallback label={route.title ?? 'Loading'} />}>
        <lazyComponent.Component />
      </Suspense>
    ) : (
      route.element
    )

    const common = {
      id: route.id,
      handle,
      element: <RouteGuard rule={effectiveAccess}>{inner}</RouteGuard>,
    }

    // Index and non-index routes are separate types in React Router — an
    // index route can't carry children or a path — so branch rather than
    // mutate a shared object.
    if (route.index) return { ...common, index: true }

    return {
      ...common,
      path: route.path,
      children: route.children?.map((child) => compile(child, effectiveAccess, [...ancestors, route.id])),
    }
  }

  const routes = manifest.map((route) => compile(route, null, []))
  return { routes, index }
}
