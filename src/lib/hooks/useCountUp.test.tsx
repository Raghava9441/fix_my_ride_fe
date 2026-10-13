import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider'
import { useCountUp } from './useCountUp'

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduced-motion') ? reduce : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

const wrapper = ({ children }: { children: ReactNode }) => <PreferencesProvider>{children}</PreferencesProvider>

describe('useCountUp', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('counts up from zero and lands exactly on the target', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useCountUp(120, 500), { wrapper })
    expect(result.current).toBe(0)

    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(120)
    expect(Number.isInteger(result.current)).toBe(true)

    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe(120)
  })

  it('glides from the previous value when the target changes', () => {
    stubMatchMedia(false)
    const { result, rerender } = renderHook(({ n }) => useCountUp(n, 400), {
      wrapper,
      initialProps: { n: 100 },
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe(100)

    rerender({ n: 200 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBeGreaterThan(100)
    expect(result.current).toBeLessThan(200)
  })

  it('returns the target immediately under reduced motion', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useCountUp(75), { wrapper })
    expect(result.current).toBe(75)
  })
})
