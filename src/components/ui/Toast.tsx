import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { AlertIcon, CheckIcon, CloseIcon } from '@/components/icons'

export type ToastTone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: ToastTone
  message: string
  /** Shown under the message — a request id, or what to do next. */
  detail?: string
}

interface ToastContextValue {
  toast: (message: string, options?: { tone?: ToastTone; detail?: string }) => void
  success: (message: string, detail?: string) => void
  error: (message: string, detail?: string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** How many toasts can be on screen at once before the oldest are dropped. */
const MAX_VISIBLE = 4

const DURATIONS: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  // Errors stay longer: they usually carry a reference id someone needs to
  // read or copy, and four seconds is not enough to notice and act on one.
  error: 9000,
}

/**
 * Transient feedback for actions whose result isn't otherwise visible.
 *
 * A mutation that changes something on screen doesn't need a toast — the
 * screen changing *is* the feedback. These are for the cases where it isn't:
 * a delete that navigates away, an upload that finishes after you've scrolled
 * on, a failure that would otherwise be silent.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    (message, options) => {
      const tone = options?.tone ?? 'info'
      const id = nextId.current++

      setToasts((current) => {
        const next = [...current, { id, tone, message, detail: options?.detail }]
        // Cap the stack. A burst of failures — a bulk action against a down
        // API — would otherwise cover the screen with toasts.
        const capped = next.slice(-MAX_VISIBLE)

        /*
         * Cancel the timers of anything the cap just dropped. Without this
         * each evicted toast keeps a live timeout that fires minutes later
         * into a `setToasts` which changes nothing but still re-renders every
         * subscriber — during exactly the failure burst the cap exists to
         * contain.
         */
        for (const dropped of next.slice(0, next.length - capped.length)) {
          const timer = timers.current.get(dropped.id)
          if (timer) {
            clearTimeout(timer)
            timers.current.delete(dropped.id)
          }
        }

        return capped
      })

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATIONS[tone]),
      )
    },
    [dismiss],
  )

  // Timers outlive the component without this, and fire into a dead setState.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (message, detail) => toast(message, { tone: 'success', detail }),
      error: (message, detail) => toast(message, { tone: 'error', detail }),
    }),
    [toast, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/*
        `aria-live="polite"` announces without interrupting; assertive would
        cut off whatever a screen reader is mid-sentence on for something that
        is, by design, non-blocking.

        Bottom on mobile so it sits near the thumb and clear of the top bar;
        bottom-right on desktop where it won't cover content.
      */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
        style={{ zIndex: 'var(--z-toast)' }}
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={clsx(
              'anim-pop-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card border px-3 py-2.5 shadow-[var(--shadow-overlay)]',
              item.tone === 'success' && 'border-success/30 bg-success-bg',
              item.tone === 'error' && 'border-critical/30 bg-critical-bg',
              item.tone === 'info' && 'border-border bg-surface-overlay',
            )}
          >
            <span
              className={clsx(
                'mt-0.5 flex h-4 w-4 flex-none items-center justify-center',
                item.tone === 'success' && 'text-success',
                item.tone === 'error' && 'text-critical',
                item.tone === 'info' && 'text-text-muted',
              )}
            >
              {item.tone === 'error' ? (
                <AlertIcon className="h-4 w-4" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text">{item.message}</p>
              {item.detail && <p className="mt-0.5 font-mono text-[11px] text-text-muted">{item.detail}</p>}
            </div>

            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
              className="interactive -m-1 flex-none rounded-input p-1 text-text-muted hover:bg-surface-sunken hover:text-text"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
