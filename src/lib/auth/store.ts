import { create } from 'zustand'
import { apiRequest, setUnauthorizedHandler } from '../api/client'
import { getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from './tokenStore'

export interface AuthUser {
  id: string
  email: string
  role: string
  tenantId?: string
}

interface LoginResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface MeResponse {
  id: string
  email: string
  primaryRole: string
  tenantId?: string
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  async login(email, password) {
    set({ status: 'loading' })
    try {
      const data = await apiRequest<LoginResponse>({
        method: 'POST',
        url: '/auth/login',
        data: { email, password },
      })
      setAccessToken(data.accessToken)
      setRefreshToken(data.refreshToken)
      set({ user: data.user, status: 'authenticated' })
    } catch (err) {
      set({ status: 'unauthenticated' })
      throw err
    }
  },

  logout() {
    clearTokens()
    set({ user: null, status: 'unauthenticated' })
  },

  async bootstrap() {
    if (!getRefreshToken()) {
      set({ status: 'unauthenticated' })
      return
    }
    set({ status: 'loading' })
    try {
      // No access token exists yet on a fresh page load — this 401s once,
      // the client's response interceptor refreshes it, then retries.
      const me = await apiRequest<MeResponse>({ method: 'GET', url: '/auth/me' })
      set({
        user: { id: me.id, email: me.email, role: me.primaryRole, tenantId: me.tenantId },
        status: 'authenticated',
      })
    } catch {
      clearTokens()
      set({ user: null, status: 'unauthenticated' })
    }
  },
}))

setUnauthorizedHandler(() => {
  useAuthStore.setState({ user: null, status: 'unauthenticated' })
})
