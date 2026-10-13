import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Animates a number toward `target`, starting from wherever it last was —
 * so the first render counts up from zero and a later data refresh glides
 * from the old figure to the new one instead of snapping.
 *
 * Integers stay integers while counting; otherwise a "42 jobs" tile would
 * flicker through 17.3 and 31.8. Under reduced motion it returns the target
 * unchanged.
 */
export function useCountUp(target: number, duration = 800): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (reduced || !Number.isFinite(target) || from.current === target) return

    const start = performance.now()
    const origin = from.current
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const next = t === 1 ? target : origin + (target - origin) * (1 - Math.pow(1 - t, 3))
      from.current = next
      setValue(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])

  if (reduced || !Number.isFinite(target)) return target
  return Number.isInteger(target) ? Math.round(value) : value
}
