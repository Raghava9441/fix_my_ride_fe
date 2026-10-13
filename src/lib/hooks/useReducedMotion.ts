import { useSyncExternalStore } from 'react'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

/**
 * Whether animation should be suppressed.
 *
 * The CSS layer already collapses durations for both the in-app motion
 * preference and the OS setting, but that cannot reach a canvas render loop —
 * JS-driven animation has to ask. True when either source says "reduced".
 */
export function useReducedMotion(): boolean {
  const { preferences } = usePreferences()
  const osReduced = useSyncExternalStore(subscribe, getSnapshot, () => false)
  return osReduced || preferences.motion === 'reduced'
}
