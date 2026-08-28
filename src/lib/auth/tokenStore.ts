// Access token lives in memory only (module state) — never touches
// localStorage, so it isn't readable by an injected script. The refresh
// token is the only thing persisted, since it's what survives a reload.
const REFRESH_KEY = 'fmr.refreshToken'

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(REFRESH_KEY, token)
    else localStorage.removeItem(REFRESH_KEY)
  } catch {
    // storage unavailable (private mode, etc.) — session just won't survive a reload
  }
}

export function clearTokens(): void {
  accessToken = null
  setRefreshToken(null)
}
