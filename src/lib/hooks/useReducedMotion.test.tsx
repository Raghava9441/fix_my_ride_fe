import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider'
import { PREFERENCES_STORAGE_KEY } from '@/lib/preferences/types'
import { useReducedMotion } from './useReducedMotion'

type Listener = (e: { matches: boolean }) => void

function stubMatchMedia(reduce: boolean) {
  const listeners = new Set<Listener>()
  let matches = reduce
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? matches : false,
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  }))
  return {
    set(next: boolean) {
      matches = next
      for (const fn of listeners) fn({ matches: next })
    },
  }
}

const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider>{children}</PreferencesProvider>

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('is false when neither the OS nor the app asks for reduced motion', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion(), { wrapper })
    expect(result.current).toBe(false)
  })

  it('follows the OS setting, including live changes', () => {
    const mq = stubMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion(), { wrapper })
    act(() => mq.set(true))
    expect(result.current).toBe(true)
  })

  it('follows the in-app motion preference', () => {
    stubMatchMedia(false)
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ motion: 'reduced' }))
    const { result } = renderHook(() => useReducedMotion(), { wrapper })
    expect(result.current).toBe(true)
  })
})
