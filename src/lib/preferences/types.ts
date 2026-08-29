/**
 * The appearance-preference schema.
 *
 * One registry, three consumers: the pre-paint bootstrap in index.html,
 * `PreferencesProvider`, and the Settings screen — which renders itself
 * entirely from `APPEARANCE_AXES` rather than hard-coding a control per
 * axis. Adding an axis is a change to this file plus a block in
 * tokens.css; no screen needs editing.
 *
 * Every axis maps to a `data-*` attribute on <html>. Axes are independent
 * by construction: a value on one must never require a particular value
 * on another, which is what lets the token layer stay a flat set of
 * single-attribute selectors.
 */

export type ThemeMode = 'auto' | 'light' | 'dark'
export type AccentKey = 'teal' | 'amber' | 'indigo' | 'violet' | 'rose' | 'slate'
export type ShapeKey = 'sharp' | 'soft' | 'capsule'
export type DensityKey = 'comfortable' | 'cozy' | 'compact'
export type TypeScaleKey = 'sm' | 'md' | 'lg' | 'xl'
export type FontKey = 'technical' | 'operator' | 'precision' | 'humanist'
export type ContrastKey = 'standard' | 'high'
export type MotionKey = 'full' | 'reduced'
export type ColorVisionKey = 'default' | 'deuteranopia' | 'tritanopia'
export type NavKey = 'sidebar' | 'topbar'

export interface Preferences {
  theme: ThemeMode
  accent: AccentKey
  shape: ShapeKey
  density: DensityKey
  typeScale: TypeScaleKey
  font: FontKey
  contrast: ContrastKey
  motion: MotionKey
  colorVision: ColorVisionKey
  nav: NavKey
  /** Side nav rail collapsed to icons only. Layout state, persisted with the rest. */
  navCollapsed: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'auto',
  accent: 'teal',
  shape: 'soft',
  density: 'comfortable',
  typeScale: 'md',
  font: 'technical',
  contrast: 'standard',
  motion: 'full',
  colorVision: 'default',
  nav: 'sidebar',
  navCollapsed: false,
}

/* ------------------------------------------------------------------ */
/* Axis registry                                                       */
/* ------------------------------------------------------------------ */

export type AxisGroup = 'appearance' | 'layout' | 'accessibility'

export interface AxisOption<V> {
  value: V
  label: string
  /** Secondary line under the label — a font pairing, a use case, a caveat. */
  hint?: string
  /** Renders a color chip in the picker. Used by the accent axis. */
  swatchVar?: string
}

export interface AxisDefinition<K extends keyof Preferences = keyof Preferences> {
  key: K
  label: string
  description: string
  group: AxisGroup
  /** The `data-*` attribute this axis writes to <html>. */
  attribute: string
  /**
   * Value that means "defer to the platform" — written as an *absent*
   * attribute so the CSS `:root:not([data-theme='light'])` guards work.
   */
  autoValue?: Preferences[K]
  options: AxisOption<Preferences[K]>[]
}

/**
 * Declared as a tuple of per-axis definitions rather than a map so the
 * order here is the order the Settings screen renders in.
 */
export const APPEARANCE_AXES = [
  {
    key: 'theme',
    label: 'Theme',
    description: 'Auto follows your operating system setting.',
    group: 'appearance',
    attribute: 'data-theme',
    autoValue: 'auto',
    options: [
      { value: 'auto', label: 'Auto', hint: 'Match system' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  } satisfies AxisDefinition<'theme'>,
  {
    key: 'accent',
    label: 'Accent',
    description: 'Used for primary actions, selection, and focus rings.',
    group: 'appearance',
    attribute: 'data-accent',
    options: [
      { value: 'teal', label: 'Gauge Teal', swatchVar: '--teal-500' },
      { value: 'amber', label: 'Torque Amber', swatchVar: '--amber-500' },
      { value: 'indigo', label: 'Denim Indigo', swatchVar: '--indigo-500' },
      { value: 'violet', label: 'Ion Violet', swatchVar: '--violet-500' },
      { value: 'rose', label: 'Brake Rose', swatchVar: '--rose-500' },
      { value: 'slate', label: 'Shop Slate', swatchVar: '--slate-500' },
    ],
  } satisfies AxisDefinition<'accent'>,
  {
    key: 'shape',
    label: 'Shape',
    description: 'Corner radius, border weight, and elevation together.',
    group: 'appearance',
    attribute: 'data-shape',
    options: [
      { value: 'sharp', label: 'Sharp', hint: 'Square, flat, hairline borders' },
      { value: 'soft', label: 'Soft', hint: 'Rounded with a light shadow' },
      { value: 'capsule', label: 'Capsule', hint: 'Fully rounded, lifted' },
    ],
  } satisfies AxisDefinition<'shape'>,
  {
    key: 'font',
    label: 'Typeface',
    description: 'Display, body, and monospace faces as a matched set.',
    group: 'appearance',
    attribute: 'data-font',
    options: [
      { value: 'technical', label: 'Workshop Technical', hint: 'Archivo · Public Sans' },
      { value: 'operator', label: 'Trusted Operator', hint: 'Zilla Slab · Karla' },
      { value: 'precision', label: 'Precision Digital', hint: 'League Spartan · Hanken Grotesk' },
      { value: 'humanist', label: 'Editorial Humanist', hint: 'Source Serif · Inter' },
    ],
  } satisfies AxisDefinition<'font'>,
  {
    key: 'density',
    label: 'Density',
    description: 'Spacing throughout the app. Independent of text size.',
    group: 'layout',
    attribute: 'data-density',
    options: [
      { value: 'comfortable', label: 'Comfortable' },
      { value: 'cozy', label: 'Cozy' },
      { value: 'compact', label: 'Compact', hint: 'Most rows per screen' },
    ],
  } satisfies AxisDefinition<'density'>,
  {
    key: 'nav',
    label: 'Navigation',
    description: 'Where the primary navigation sits.',
    group: 'layout',
    attribute: 'data-nav',
    options: [
      { value: 'sidebar', label: 'Side rail', hint: 'Best for deep sections' },
      { value: 'topbar', label: 'Top bar', hint: 'Maximises content width' },
    ],
  } satisfies AxisDefinition<'nav'>,
  {
    key: 'typeScale',
    label: 'Text size',
    description: 'Scales every text style. Independent of spacing density.',
    group: 'accessibility',
    attribute: 'data-type-scale',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Default' },
      { value: 'lg', label: 'Large' },
      { value: 'xl', label: 'Extra large' },
    ],
  } satisfies AxisDefinition<'typeScale'>,
  {
    key: 'contrast',
    label: 'Contrast',
    description: 'Strengthens borders, secondary text, and the focus ring.',
    group: 'accessibility',
    attribute: 'data-contrast',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'high', label: 'High', hint: 'Heavier separators and focus ring' },
    ],
  } satisfies AxisDefinition<'contrast'>,
  {
    key: 'motion',
    label: 'Motion',
    description: 'A system-level reduced-motion setting always wins over this.',
    group: 'accessibility',
    attribute: 'data-motion',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'reduced', label: 'Reduced', hint: 'Near-instant transitions' },
    ],
  } satisfies AxisDefinition<'motion'>,
  {
    key: 'colorVision',
    label: 'Color vision',
    description: 'Re-hues status colors so they stay distinguishable.',
    group: 'accessibility',
    attribute: 'data-color-vision',
    options: [
      { value: 'default', label: 'Default', hint: 'Green · amber · red' },
      { value: 'deuteranopia', label: 'Deuteranopia', hint: 'Blue · amber · magenta' },
      { value: 'tritanopia', label: 'Tritanopia', hint: 'Green · magenta · red' },
    ],
  } satisfies AxisDefinition<'colorVision'>,
] as const

export const AXIS_GROUPS: { id: AxisGroup; label: string; description: string }[] = [
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Color, shape, and type. Personal to this browser.',
  },
  { id: 'layout', label: 'Layout & density', description: 'How much fits on screen, and where nav lives.' },
  {
    id: 'accessibility',
    label: 'Accessibility',
    description: 'Sizing, contrast, and motion adjustments.',
  },
]

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export const PREFERENCES_STORAGE_KEY = 'fmr.preferences'

/**
 * Bump when a stored shape stops being readable by `migrate()`. v1 had
 * `density: 'comfortable' | 'compact'` doubling as the type-size control;
 * v2 splits that into `density` + `typeScale`.
 */
export const PREFERENCES_VERSION = 2

interface StoredPreferences extends Partial<Preferences> {
  __v?: number
}

/** Forward-migrates a stored blob of any prior version to the current shape. */
function migrate(stored: StoredPreferences): Partial<Preferences> {
  const version = stored.__v ?? 1
  const next: Partial<Preferences> = { ...stored }
  delete (next as StoredPreferences).__v

  if (version < 2) {
    // v1 compact meant "tighter spacing *and* smaller text". Preserve the
    // user's intent by splitting it across the two axes that replaced it.
    next.typeScale = stored.density === 'compact' ? 'sm' : 'md'
  }

  return next
}

/** Drops unknown keys and out-of-range values so a hand-edited or stale
 *  localStorage entry can't put an invalid attribute on <html>. */
function sanitize(input: Partial<Preferences>): Preferences {
  const result: Preferences = { ...DEFAULT_PREFERENCES }

  for (const axis of APPEARANCE_AXES) {
    const value = input[axis.key]
    const allowed = axis.options.some((o) => o.value === value)
    if (allowed) {
      // Each axis's option values are typed to its own key, and we just
      // checked membership — the map back to the union needs the cast.
      result[axis.key] = value as never
    }
  }

  if (typeof input.navCollapsed === 'boolean') result.navCollapsed = input.navCollapsed

  return result
}

export function readStoredPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return sanitize(migrate(JSON.parse(raw) as StoredPreferences))
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function writeStoredPreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...prefs, __v: PREFERENCES_VERSION }))
  } catch {
    // Per-viewer convenience only — private mode just won't persist it.
  }
}

/* ------------------------------------------------------------------ */
/* Applying to the DOM                                                 */
/* ------------------------------------------------------------------ */

export function applyPreferences(prefs: Preferences, root: HTMLElement = document.documentElement): void {
  for (const axis of APPEARANCE_AXES) {
    const value = prefs[axis.key]
    // `autoValue` is declared on only the axes that have one, so the array's
    // literal element type doesn't carry it everywhere — narrow with `in`.
    const autoValue = 'autoValue' in axis ? axis.autoValue : undefined
    if (autoValue !== undefined && value === autoValue) {
      // Absent, not `="auto"` — the token layer's `:not([data-theme='light'])`
      // guards depend on the attribute genuinely not being there.
      root.removeAttribute(axis.attribute)
    } else {
      root.setAttribute(axis.attribute, String(value))
    }
  }
  root.toggleAttribute('data-nav-collapsed', prefs.navCollapsed)
}
