import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/icons'
import { useBreadcrumbs } from '@/lib/routing'

/**
 * Derived from the matched route chain, never from the URL string — see
 * `useBreadcrumbs`. Hidden entirely at one level deep, where a single
 * non-link crumb duplicating the page title is just noise.
 */
export function Breadcrumbs() {
  const crumbs = useBreadcrumbs()
  if (crumbs.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
        {crumbs.map((crumb, i) => (
          <Fragment key={crumb.id}>
            {i > 0 && <ChevronRightIcon className="h-3 w-3 flex-none text-text-faint" />}
            <li className="min-w-0">
              {crumb.to ? (
                <Link to={crumb.to} className="interactive rounded-[4px] font-medium hover:text-text">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-semibold text-text">
                  {crumb.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
