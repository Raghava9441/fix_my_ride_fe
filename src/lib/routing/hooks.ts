import { useEffect, useMemo } from 'react'
import { useLocation, useMatches } from 'react-router-dom'
import type { RouteHandle } from './types'
import { routeIndex } from './router'

const APP_NAME = 'Fix My Ride'

function handlesFromMatches(matches: ReturnType<typeof useMatches>): RouteHandle[] {
  return matches
    .map((m) => m.handle as RouteHandle | undefined)
    .filter((h): h is RouteHandle => Boolean(h))
}

/** The handle of the deepest matched route — the screen actually rendering. */
export function useCurrentRoute(): RouteHandle | undefined {
  const matches = useMatches()
  return handlesFromMatches(matches).at(-1)
}

/**
 * The deepest matched route that actually names itself.
 *
 * Not the same as `useCurrentRoute()`: an index child (a detail page's
 * default tab, say) deliberately has no title of its own, and taking the
 * deepest handle blindly would blank the title on exactly those screens.
 */
function useTitleRoute(): RouteHandle | undefined {
  const matches = useMatches()
  return handlesFromMatches(matches)
    .filter((handle) => Boolean(handle.title))
    .at(-1)
}

export interface Crumb {
  id: string
  label: string
  /** Absent on the last crumb, which is the current page. */
  to?: string
}

/**
 * The breadcrumb trail, derived from the matched route chain.
 *
 * Comes from `useMatches()` rather than by splitting the URL, so a segment
 * that isn't its own route (`/settings` has no screen — only
 * `/settings/roles` does) never appears as a dead crumb. Layout and index
 * routes opt out with `breadcrumb: false`.
 *
 * Detail routes get their id substituted in as a placeholder label; a screen
 * that knows the real name — "Toyota Hilux" rather than "Vehicle" — should
 * set it with `useDocumentTitle` once loaded.
 */
export function useBreadcrumbs(): Crumb[] {
  const matches = useMatches()

  return useMemo(() => {
    const crumbs: Crumb[] = []

    for (const match of matches) {
      const handle = match.handle as RouteHandle | undefined
      if (!handle || handle.breadcrumb === false) continue

      const label = handle.breadcrumb || handle.title
      if (!label) continue

      crumbs.push({ id: handle.id, label, to: match.pathname })
    }

    // The current page is a label, not a link.
    if (crumbs.length > 0) delete crumbs[crumbs.length - 1].to

    return crumbs
    // `matches` already carries resolved pathnames, so it changes whenever a
    // route param does — no separate `useParams()` dependency needed.
  }, [matches])
}

/**
 * Sets `document.title` from the route, and lets a screen override it once
 * it knows something better than the static manifest label.
 */
export function useDocumentTitle(override?: string): void {
  const titleRoute = useTitleRoute()
  const location = useLocation()

  useEffect(() => {
    const label = override ?? titleRoute?.title
    document.title = label ? `${label} · ${APP_NAME}` : APP_NAME
  }, [override, titleRoute?.title, location.pathname])
}

/** Resolves a route id back to its manifest entry — used by nav and tabs. */
export function getRouteEntry(routeId: string) {
  return routeIndex.get(routeId)
}
