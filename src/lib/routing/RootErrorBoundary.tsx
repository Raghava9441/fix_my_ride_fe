import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { AlertIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { ApiError } from '../api/errors'

/**
 * The last line of defence for a render or loader failure.
 *
 * Two failure modes get their own treatment because the recovery differs:
 *
 *   - **A stale chunk.** After a deploy, a still-open tab holds a manifest
 *     pointing at filenames that no longer exist, so the next lazy import
 *     rejects. The fix is a reload, and offering it beats leaving someone
 *     staring at a blank page wondering what they broke.
 *   - **An `ApiError`.** We know the status and correlation id, so show
 *     them — that id is what makes a support conversation short.
 */
export function RootErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const isChunkError =
    error instanceof Error &&
    /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(error.message)

  const title = isChunkError
    ? 'A newer version is available'
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : 'Something went wrong'

  const detail = isChunkError
    ? 'This tab is running an older build of the app. Reloading will pick up the current one.'
    : error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred while rendering this page.'

  const correlationId = error instanceof ApiError ? error.correlationId : undefined

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-card bg-critical-bg text-critical">
          <AlertIcon className="h-5 w-5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl">{title}</h1>
          <p className="text-sm text-text-muted">{detail}</p>
        </div>

        {correlationId && (
          <p className="font-mono text-xs text-text-faint">Reference: {correlationId}</p>
        )}

        <div className="mt-1 flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          {!isChunkError && (
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Go back
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
