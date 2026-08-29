import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * `React.lazy` plus an explicit `preload()`.
 *
 * Code-splitting every screen is table stakes; the cost is that a click on a
 * nav item pays a network round trip before anything renders. Preloading on
 * hover/focus — a few hundred milliseconds of warning in practice — usually
 * hides that entirely, so navigation feels like an eager bundle while still
 * shipping like a split one.
 *
 * The import promise is memoised, so hovering a link ten times imports once,
 * and a later render resolves instantly from the same promise.
 */
export interface LazyRouteComponent {
  Component: LazyExoticComponent<ComponentType>
  preload: () => Promise<unknown>
}

export function lazyRoute(loader: () => Promise<{ default: ComponentType }>): LazyRouteComponent {
  let promise: Promise<{ default: ComponentType }> | null = null

  const load = () => {
    promise ??= loader().catch((error: unknown) => {
      // Don't cache a rejection: a chunk that failed on a flaky connection
      // (or because a deploy rotated the filenames) must be retryable.
      promise = null
      throw error
    })
    return promise
  }

  return { Component: lazy(load), preload: load }
}
