import { useEffect, useState } from 'react'

/**
 * Trailing-edge debounce for a value.
 *
 * Used for search-as-you-type so a query key changes once the user pauses
 * rather than on every keystroke. This reduces *how many* requests start;
 * making sure the newest one wins is a separate concern handled by request
 * cancellation in the query layer. Both are needed — debouncing alone still
 * races if two requests do go out and the slower one lands last.
 *
 * The cleanup clearing the timer is what keeps this from updating state after
 * unmount.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
