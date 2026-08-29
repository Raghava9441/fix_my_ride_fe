import { createBrowserRouter } from 'react-router-dom'
import { buildRoutes } from './buildRouter'
import { routeManifest } from './registry'
import { RootErrorBoundary } from './RootErrorBoundary'

/**
 * Compiles the manifest once, at module load, and exposes both halves:
 * the router for `<RouterProvider>`, and the flat index that navigation,
 * breadcrumbs, the command palette, and hover-preloading read.
 */
const compiled = buildRoutes(routeManifest)

export const routeIndex = compiled.index

export const router = createBrowserRouter(
  // Attached at the top level so a render error anywhere below — including
  // a chunk that fails to load after a deploy — lands somewhere recoverable
  // instead of a blank page.
  compiled.routes.map((route) => ({ ...route, errorElement: <RootErrorBoundary /> })),
)

/** Warms a route's chunk. Called on nav hover/focus. */
export function preloadRoute(routeId: string): void {
  void routeIndex.get(routeId)?.preload?.()
}
