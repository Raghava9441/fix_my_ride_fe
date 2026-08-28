export type ThemeMode = 'auto' | 'light' | 'dark'
export type AccentKey = 'teal' | 'amber' | 'indigo'
export type ShapeKey = 'sharp' | 'soft' | 'capsule'
export type DensityKey = 'comfortable' | 'compact'
export type FontKey = 'technical' | 'operator' | 'precision'
export type NavKey = 'sidebar' | 'topbar'

export interface Preferences {
  theme: ThemeMode
  accent: AccentKey
  shape: ShapeKey
  density: DensityKey
  font: FontKey
  nav: NavKey
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'auto',
  accent: 'teal',
  shape: 'soft',
  density: 'comfortable',
  font: 'technical',
  nav: 'sidebar',
}

export const PREFERENCE_OPTIONS: {
  theme: { value: ThemeMode; label: string }[]
  accent: { value: AccentKey; label: string }[]
  shape: { value: ShapeKey; label: string }[]
  density: { value: DensityKey; label: string }[]
  font: { value: FontKey; label: string; sample: string }[]
  nav: { value: NavKey; label: string }[]
} = {
  theme: [
    { value: 'auto', label: 'Auto' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ],
  accent: [
    { value: 'teal', label: 'Gauge Teal' },
    { value: 'amber', label: 'Torque Amber' },
    { value: 'indigo', label: 'Denim Indigo' },
  ],
  shape: [
    { value: 'sharp', label: 'Sharp' },
    { value: 'soft', label: 'Soft' },
    { value: 'capsule', label: 'Capsule' },
  ],
  density: [
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'compact', label: 'Compact' },
  ],
  font: [
    { value: 'technical', label: 'Workshop Technical', sample: 'Archivo · Public Sans' },
    { value: 'operator', label: 'Trusted Operator', sample: 'Zilla Slab · Karla' },
    { value: 'precision', label: 'Precision Digital', sample: 'League Spartan · Hanken Grotesk' },
  ],
  nav: [
    { value: 'sidebar', label: 'Sidebar' },
    { value: 'topbar', label: 'Top bar' },
  ],
}

export const PREFERENCES_STORAGE_KEY = 'fmr.preferences'

export function applyPreferences(prefs: Preferences, root: HTMLElement = document.documentElement): void {
  if (prefs.theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', prefs.theme)
  root.setAttribute('data-accent', prefs.accent)
  root.setAttribute('data-shape', prefs.shape)
  root.setAttribute('data-density', prefs.density)
  root.setAttribute('data-font', prefs.font)
  root.setAttribute('data-nav', prefs.nav)
}

export function readStoredPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}
