import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth/store'

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-text-muted">Loading…</div>
    )
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
