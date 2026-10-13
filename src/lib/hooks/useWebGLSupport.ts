interface NetworkInformationLike {
  saveData?: boolean
}

let cached: boolean | undefined

/**
 * One-time check for whether a decorative 3D scene is worth mounting.
 *
 * False when WebGL2 is unavailable, or when the user has asked the browser to
 * save data / the device reports very little memory. The scene is purely
 * decorative, so skipping it is always a safe answer.
 */
export function detectWebGLSupport(): boolean {
  if (cached !== undefined) return cached
  cached = compute()
  return cached
}

function compute(): boolean {
  if (typeof document === 'undefined') return false

  const nav = navigator as Navigator & { connection?: NetworkInformationLike; deviceMemory?: number }
  if (nav.connection?.saveData) return false
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 2) return false

  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

/** Test seam: forget the memoised answer. */
export function __resetWebGLSupportCache(): void {
  cached = undefined
}

export function useWebGLSupport(): boolean {
  return detectWebGLSupport()
}
