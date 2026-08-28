import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  applyPreferences,
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readStoredPreferences,
  type Preferences,
} from './types'

interface PreferencesContextValue {
  preferences: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  reset: () => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // index.html applies the stored/default attributes synchronously before
  // paint (avoids a flash-of-default-theme) — this just mirrors that state.
  const [preferences, setPreferences] = useState<Preferences>(() => readStoredPreferences())

  useEffect(() => {
    applyPreferences(preferences)
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // per-viewer convenience only — fine if it doesn't persist
    }
  }, [preferences])

  const setPreference: PreferencesContextValue['setPreference'] = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => setPreferences(DEFAULT_PREFERENCES)

  return (
    <PreferencesContext.Provider value={{ preferences, setPreference, reset }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}
