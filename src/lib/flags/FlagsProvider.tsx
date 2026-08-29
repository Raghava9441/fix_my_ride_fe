import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { resolveFlags, writeLocalOverrides, type FeatureFlagKey, type FlagState } from './flags'

interface FlagsContextValue {
  flags: FlagState
  isEnabled: (key: FeatureFlagKey) => boolean
  /** Dev-only local override. No-op in a production build. */
  setOverride: (key: FeatureFlagKey, value: boolean) => void
}

const FlagsContext = createContext<FlagsContextValue | null>(null)

export function FlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FlagState>(() => resolveFlags())

  const value = useMemo<FlagsContextValue>(
    () => ({
      flags,
      isEnabled: (key) => flags[key],
      setOverride: (key, next) => {
        if (!import.meta.env.DEV) return
        setFlags((prev) => {
          const updated = { ...prev, [key]: next }
          writeLocalOverrides(updated)
          return updated
        })
      },
    }),
    [flags],
  )

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext)
  if (!ctx) throw new Error('useFlags must be used within a FlagsProvider')
  return ctx
}

export function useFlag(key: FeatureFlagKey): boolean {
  return useFlags().isEnabled(key)
}
