/**
 * What renders while a route's chunk downloads or the session resolves.
 *
 * Deliberately a *layout* skeleton rather than a spinner: it reserves the
 * same header and card geometry the real screen will use, so the page
 * doesn't jump when content arrives. A centred spinner in a full-height box
 * looks tidier in isolation and worse in sequence.
 */
export function RouteFallback({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col gap-5 p-1" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="route-progress" aria-hidden="true" />

      <div className="flex flex-col gap-2">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-7 w-64" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20 rounded-card" />
        ))}
      </div>

      <div className="skeleton h-64 rounded-card" />
    </div>
  )
}
