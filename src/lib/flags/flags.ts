/**
 * Feature flags.
 *
 * Flags exist so a route can ship dark: it stays in the registry, keeps its
 * path and access rule, and is simply unreachable until the flag turns on.
 * That is what makes trunk-based work on a large route tree tolerable — a
 * half-built section is one boolean away from being live, not a branch that
 * has to be rebased for a month.
 *
 * Resolution order, first match wins:
 *   1. `localStorage['fmr.flags']` — per-developer overrides, dev only.
 *   2. `VITE_FLAG_<UPPER_SNAKE>` build-time env var ("true"/"false").
 *   3. The default in `FLAG_DEFINITIONS` below.
 *
 * When there is a real flag service, `resolveFlags()` is the seam: it
 * becomes the initial state and the provider subscribes for updates. The
 * rest of the app only ever sees `useFlag()`.
 */

export interface FlagDefinition {
  key: string
  description: string
  /** Value when nothing overrides it. */
  default: boolean
}

export const FLAG_DEFINITIONS = {
  billing: {
    key: 'billing',
    description: 'Subscriptions, invoices, and payment history screens.',
    default: true,
  },
  reports: {
    key: 'reports',
    description: 'Reporting and analytics section.',
    default: true,
  },
  documents: {
    key: 'documents',
    description: 'Document library and per-vehicle attachments.',
    default: true,
  },
  auditLog: {
    key: 'auditLog',
    description: 'Platform audit log browser (admin only).',
    default: true,
  },
  notifications: {
    key: 'notifications',
    description: 'In-app notification centre.',
    default: true,
  },
  commandPalette: {
    key: 'commandPalette',
    description: 'Ctrl/Cmd-K navigation palette.',
    default: true,
  },
  serviceQueue: {
    key: 'serviceQueue',
    description: 'Live service-bay queue board. Not yet backed by an API.',
    default: false,
  },
} as const satisfies Record<string, FlagDefinition>

export type FeatureFlagKey = keyof typeof FLAG_DEFINITIONS

export type FlagState = Record<FeatureFlagKey, boolean>

const FLAG_STORAGE_KEY = 'fmr.flags'

function readLocalOverrides(): Partial<FlagState> {
  if (!import.meta.env.DEV) return {}
  try {
    const raw = localStorage.getItem(FLAG_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<FlagState>) : {}
  } catch {
    return {}
  }
}

function readEnvOverride(key: FeatureFlagKey): boolean | undefined {
  const envKey = `VITE_FLAG_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`
  const raw = (import.meta.env as Record<string, string | undefined>)[envKey]
  if (raw === undefined) return undefined
  return raw === 'true' || raw === '1'
}

export function resolveFlags(): FlagState {
  const overrides = readLocalOverrides()
  const state = {} as FlagState

  for (const key of Object.keys(FLAG_DEFINITIONS) as FeatureFlagKey[]) {
    state[key] = overrides[key] ?? readEnvOverride(key) ?? FLAG_DEFINITIONS[key].default
  }

  return state
}

export function writeLocalOverrides(overrides: Partial<FlagState>): void {
  try {
    localStorage.setItem(FLAG_STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // dev convenience only
  }
}
