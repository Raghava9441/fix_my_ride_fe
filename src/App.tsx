import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider'
import { FlagsProvider } from '@/lib/flags/FlagsProvider'
import { AccessProvider } from '@/lib/access'
import { ToastProvider } from '@/components/ui'
import { useAuthStore } from '@/lib/auth/store'
import { router } from '@/lib/routing'

/**
 * Provider order is load-bearing:
 *
 *   QueryClient      — data, needed by everything below
 *     Preferences    — theming, independent of session
 *       Flags        — feature state, read by the access layer
 *         Access     — resolves the session + flags into capabilities
 *           Toast    — feedback surface, above the router so a toast
 *                      survives the navigation that triggered it
 *             Router — every guard and nav filter reads Access
 *
 * The router has to be innermost. Its guards call `useAccess()` during
 * render, so it cannot mount above the provider that supplies it.
 *
 * Toast sits directly above it for a specific reason: deleting a record
 * navigates back to its list, and a toast owned by the unmounting screen
 * would be torn down with it — the confirmation would flash and vanish.
 */
export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)

  // Attempt to restore a session from the persisted refresh token before
  // the first guarded route resolves. Guards render a skeleton rather than
  // redirecting while `status` is 'loading', so a hard refresh on a deep
  // link doesn't bounce an authenticated user to sign-in.
  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <FlagsProvider>
          <AccessProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </AccessProvider>
        </FlagsProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
