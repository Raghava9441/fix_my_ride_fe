export { ROUTE_PATHS, buildPath, withQuery, to } from './paths'
export type { RoutePathKey, RoutePathTemplate, PathParams } from './paths'

export { NAV_SECTIONS } from './types'
export type { AppRoute, NavMeta, NavSectionId, RouteHandle, IconComponent } from './types'

export { routeManifest } from './registry'
export { router, routeIndex, preloadRoute } from './router'
export { buildRoutes } from './buildRouter'
export type { RouteIndex, RouteIndexEntry } from './buildRouter'

export { buildNavigation, useNavigation, useCommandTargets } from './navigation'
export type { NavItem, NavSection, CommandTarget } from './navigation'

export { useBreadcrumbs, useCurrentRoute, useDocumentTitle, getRouteEntry } from './hooks'
export type { Crumb } from './hooks'

export { RouteGuard } from './guards'
export { RouteFallback } from './RouteFallback'
export { AccessDeniedView } from './AccessDeniedView'
export { RootErrorBoundary } from './RootErrorBoundary'
