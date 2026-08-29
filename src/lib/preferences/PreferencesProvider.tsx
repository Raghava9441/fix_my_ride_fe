import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readStoredPreferences,
  writeStoredPreferences,
  type Preferences,
} from './types'

interface PreferencesContextValue {
  preferences: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  reset: () => void
  /** Whether the *resolved* theme is dark, with `auto` folded in. */
  isDark: boolean
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function resolveIsDark(theme: Preferences['theme']): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // index.html applies the stored attributes synchronously before paint
  // (avoids a flash of the default theme) — this mirrors that same state
  // into React so components can branch on it.
  const [preferences, setPreferences] = useState<Preferences>(() => readStoredPreferences())
  const [systemDark, setSystemDark] = useState(() => resolveIsDark('auto'))

  useEffect(() => {
    applyPreferences(preferences)
    writeStoredPreferences(preferences)
  }, [preferences])

  // Keep `auto` genuinely automatic while the tab is open.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // A second tab changing preferences should not leave this one stale.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFERENCES_STORAGE_KEY) setPreferences(readStoredPreferences())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setPreference = useCallback<PreferencesContextValue['setPreference']>((key, value) => {
    setPreferences((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setPreferences(DEFAULT_PREFERENCES), [])

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      setPreference,
      reset,
      isDark: preferences.theme === 'auto' ? systemDark : preferences.theme === 'dark',
    }),
    [preferences, setPreference, reset, systemDark],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}
