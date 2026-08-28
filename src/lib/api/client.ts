import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios'
import { ApiError } from './errors'
import type { ApiEnvelope } from './types'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '../auth/tokenStore'

const baseURL = import.meta.env.VITE_API_URL as string

export const http = axios.create({ baseURL })

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let onUnauthorized: (() => void) | null = null

/** Registered once by the auth store, so this module never imports it back (avoids a cycle). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  try {
    // Raw axios call, not `http` — going through the wrapped instance would
    // re-enter this same interceptor on failure.
    const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${baseURL}/auth/refresh-token`,
      { refreshToken },
    )
    if (res.data.success) {
      setAccessToken(res.data.data.accessToken)
      setRefreshToken(res.data.data.refreshToken)
      return res.data.data.accessToken
    }
    return null
  } catch {
    return null
  }
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const isAuthEndpoint =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh-token')

    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newToken = await refreshPromise
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`)
        return http(original)
      }
      clearTokens()
      onUnauthorized?.()
    }

    const body = error.response?.data
    if (body && body.success === false) {
      return Promise.reject(new ApiError(body))
    }
    return Promise.reject(
      new ApiError({
        success: false,
        statusCode: status ?? 0,
        message: error.message || 'Network error — check the API is running.',
        timestamp: new Date().toISOString(),
      }),
    )
  },
)

/** Thin wrapper that unwraps the `{ success, data }` envelope and throws ApiError on failure. */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await http.request<ApiEnvelope<T>>(config)
  if (res.data.success) return res.data.data
  throw new ApiError(res.data)
}
