import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { SearchIcon } from '@/components/icons'
import { Kbd } from '@/components/ui'
import { preloadRoute, useCommandTargets, type CommandTarget } from '@/lib/routing'

/**
 * Ctrl/⌘-K navigation.
 *
 * Built entirely from the route index, which is what makes it worth having
 * rather than a nice-to-have: every screen the user may open is offered,
 * including the ones that aren't in the nav (personal settings, admin
 * sub-pages, plan comparison), and none that they'd be refused — the same
 * access rules filter it. Adding a route makes it findable with no further
 * work.
 *
 * Scoring is a small subsequence match rather than a fuzzy-search library:
 * the corpus is a few dozen fixed strings, so anything heavier is weight
 * without benefit.
 */

interface ScoredTarget {
  target: CommandTarget
  score: number
}

function score(target: CommandTarget, query: string): number {
  if (!query) return 1

  const haystacks = [target.title.toLowerCase(), ...target.keywords.map((k) => k.toLowerCase())]

  let best = 0
  for (const hay of haystacks) {
    if (hay === query) best = Math.max(best, 100)
    else if (hay.startsWith(query)) best = Math.max(best, 80)
    else if (hay.includes(query)) best = Math.max(best, 60)
    else if (isSubsequence(query, hay)) best = Math.max(best, 30)
  }
  return best
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0
  for (const char of haystack) {
    if (char === needle[i]) i++
    if (i === needle.length) return true
  }
  return i === needle.length
}

/**
 * Mounted only while open (see `AppShell`), so the query and highlight reset
 * themselves through `useState` initialisation rather than an effect that
 * clears them — which is both less code and one fewer render per open.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const targets = useCommandTargets()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return targets
      .map<ScoredTarget>((target) => ({ target, score: score(target, q) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.target.title.localeCompare(b.target.title))
      .slice(0, 12)
  }, [targets, query])

  // Derived, not stored: typing shrinks the result list, and a stale index
  // would leave the highlight off the end of it.
  const highlighted = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1)

  // A layout effect rather than `requestAnimationFrame`: the input is already
  // in the DOM by this point, and rAF is throttled or suspended entirely for
  // a page that isn't compositing (background tab, occluded window), which
  // would leave the palette open and unfocused.
  useLayoutEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const commit = (target: CommandTarget) => {
    navigate(target.path)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length > 0) setActiveIndex((highlighted + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length > 0) setActiveIndex((highlighted - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = results[highlighted]
      if (chosen) commit(chosen.target)
    }
  }

  return (
    <div
      className="anim-fade-in fixed inset-0 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      style={{ zIndex: 'var(--z-modal-scrim)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search screens"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="anim-pop-in flex w-full max-w-lg flex-col overflow-hidden rounded-card border border-border bg-surface-overlay shadow-[var(--shadow-overlay)]"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <SearchIcon className="h-4 w-4 flex-none text-text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to…"
            aria-label="Search screens"
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-faint"
          />
          <Kbd>Esc</Kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
            {results.map((result, i) => (
              <li key={result.target.id}>
                <button
                  type="button"
                  data-active={i === highlighted}
                  onMouseEnter={() => {
                    setActiveIndex(i)
                    preloadRoute(result.target.id)
                  }}
                  onClick={() => commit(result.target)}
                  className={clsx(
                    'interactive flex w-full items-center justify-between gap-3 rounded-input px-3 py-2 text-left',
                    i === highlighted ? 'bg-accent-bg text-text' : 'text-text-muted hover:bg-surface-sunken',
                  )}
                >
                  <span className="truncate text-sm font-semibold">{result.target.title}</span>
                  <span className="flex-none font-mono text-[10px] text-text-faint">{result.target.path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
