import { useEffect, useRef, type ReactNode } from 'react'
import clsx from 'clsx'
import { CloseIcon } from '@/components/icons'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

/**
 * A modal dialog, built on the native `<dialog>` element.
 *
 * `showModal()` gives us focus trapping, Escape-to-close, inerting of the rest
 * of the page, and top-layer stacking — all behaviours that are genuinely hard
 * to reimplement correctly and are the usual reason a hand-rolled modal is
 * inaccessible. The alternative was a focus-trap dependency; the platform
 * already does it.
 *
 * Two things the native element still needs help with:
 *
 *   - Escape fires `cancel`, which closes the dialog directly rather than
 *     going through our `onClose`. Intercepting it keeps React state as the
 *     single source of truth for whether the dialog is open.
 *   - A click on the backdrop lands on the `<dialog>` itself, not on a child,
 *     which is what makes click-outside detectable without a wrapper element.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      // The page behind a modal must not scroll under it on mobile, where the
      // scroll chains through to the body.
      document.body.style.overflow = 'hidden'
    } else if (!open && dialog.open) {
      dialog.close()
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    const onCancel = (event: Event) => {
      // Escape would otherwise close the element while React still believes
      // it's open, and the next `open` render would be a no-op.
      event.preventDefault()
      onClose()
    }

    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      onClick={(event) => {
        // Only the backdrop resolves to the dialog itself; anything inside the
        // panel has a child as its target.
        if (event.target === ref.current) onClose()
      }}
      className={clsx(
        // `m-auto` restores the centring a native `<dialog>` gets for free.
        // Tailwind's preflight zeroes every element's margin, which pins the
        // dialog to the top of the viewport instead.
        'm-auto w-[calc(100vw-2rem)] rounded-card border border-border bg-surface-raised p-0 text-text shadow-[var(--shadow-overlay)]',
        'backdrop:bg-black/50 backdrop:backdrop-blur-[2px]',
        'anim-pop-in open:flex open:flex-col',
        sizes[size],
      )}
      // `max-height` plus an internal scroll keeps a long form usable on a
      // short screen instead of pushing its actions off the bottom.
      style={{ maxHeight: 'min(90vh, 720px)' }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] leading-tight">{title}</h2>
          {description && <p className="text-xs text-text-muted">{description}</p>}
        </div>
        <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="Close">
          <CloseIcon className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

      {footer && (
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          {footer}
        </footer>
      )}
    </dialog>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  /** Styles the confirm button as destructive and is the default. */
  danger?: boolean
  loading?: boolean
}

/**
 * Confirmation for an action that can't be undone.
 *
 * The confirm button is deliberately not autofocused: on a destructive dialog
 * that turns a stray Enter keypress into a deletion. The native dialog focuses
 * the first focusable element, which here is the header's close button — so
 * the default action is always "get out", never "destroy".
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  danger = true,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted">{description}</p>
    </Modal>
  )
}
