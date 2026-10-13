import { useEffect, useState } from 'react'
import { usePreferences } from '@/lib/preferences/PreferencesProvider'

export interface ThemeColors {
  accent: string
  surface: string
  muted: string
}

const FALLBACK: ThemeColors = { accent: '#14b8a6', surface: '#e5e7eb', muted: '#6b7280' }

/**
 * Resolve a CSS custom property to a `#rrggbb` string Three.js can parse.
 *
 * The tokens are var() chains that may resolve to any colour syntax, and
 * Three's own parser only understands a subset. Painting one pixel on a canvas
 * lets the browser do the conversion for whatever syntax the token uses.
 */
function resolveColor(name: string, fallback: string): string {
  try {
    const probe = document.createElement('span')
    probe.style.color = `var(${name})`
    probe.style.display = 'none'
    document.documentElement.appendChild(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()

    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx || !computed) return fallback
    ctx.fillStyle = '#000000'
    ctx.fillStyle = computed
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return fallback
  }
}

/**
 * Theme colours for imperative consumers (canvas, WebGL) that cannot use CSS
 * variables directly. Recomputed whenever a preference that feeds the token
 * layer changes, so the scene follows light/dark, accent and contrast.
 */
export function useThemeColors(): ThemeColors {
  const { isDark } = usePreferences()
  const [colors, setColors] = useState<ThemeColors>(FALLBACK)

  useEffect(() => {
    const read = () =>
      setColors((prev) => {
        const next = {
          accent: resolveColor('--accent', FALLBACK.accent),
          surface: resolveColor('--surface-sunken', FALLBACK.surface),
          muted: resolveColor('--text-muted', FALLBACK.muted),
        }
        return prev.accent === next.accent && prev.surface === next.surface && prev.muted === next.muted ? prev : next
      })

    read()
    // PreferencesProvider writes the data-* attributes in an effect that runs
    // after this component's, so reading once per render would lag a change
    // behind. Watching the attributes themselves is always current.
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [isDark])

  return colors
}
