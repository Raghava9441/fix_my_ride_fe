import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'

/**
 * A dropdown menu, built rather than pulled in.
 *
 * The app needs exactly one popover pattern — the account menu — and the
 * behaviours that make one correct are small and well defined: close on
 * outside click, close on Escape and return focus to the trigger, move
 * through items with the arrow keys, and expose `aria-expanded` /
 * `role="menu"` so it announces properly. That's this file. Reaching for a
 * headless UI library becomes the right call when the second and third
 * popover arrive (combobox, date picker) and the edge cases multiply.
 */

interface MenuProps {
  trigger: ReactElement<{ onClick?: (e: React.MouseEvent) => void; 'aria-expanded'?: boolean; 'aria-haspopup'?: string }>
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}

export function Menu({ trigger, children, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) {
      containerRef.current?.querySelector<HTMLElement>('[data-menu-trigger]')?.focus()
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // Focus the first item on open so the keyboard path works without a mouse.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('[data-menu-item]')?.focus()
  }, [open])

  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()

    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? [])
    if (items.length === 0) return

    const current = items.indexOf(document.activeElement as HTMLElement)
    const delta = e.key === 'ArrowDown' ? 1 : -1
    items[(current + delta + items.length) % items.length].focus()
  }

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e)
          setOpen((v) => !v)
        },
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        ...({ 'data-menu-trigger': '', 'aria-controls': open ? menuId : undefined } as Record<string, unknown>),
      })
    : trigger

  return (
    <div ref={containerRef} className="relative">
      {triggerElement}

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          onKeyDown={onPanelKeyDown}
          onClick={() => close(false)}
          className={clsx(
            'anim-pop-in absolute top-[calc(100%+6px)] min-w-52 overflow-hidden rounded-card border border-border bg-surface-overlay p-1 shadow-[var(--shadow-overlay)]',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
          style={{ zIndex: 'var(--z-dropdown)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function MenuItem({
  children,
  onSelect,
  danger,
  asChild,
}: {
  children: ReactNode
  onSelect?: () => void
  danger?: boolean
  /** Render the child (usually a `<Link>`) as the item instead of a button. */
  asChild?: boolean
}) {
  const className = clsx(
    'interactive flex w-full items-center gap-2.5 rounded-input px-2.5 py-2 text-left text-sm font-medium',
    danger ? 'text-critical hover:bg-critical-bg' : 'text-text hover:bg-surface-sunken',
  )

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>
    return cloneElement(child, {
      className: clsx(className, child.props.className),
      ...({ role: 'menuitem', 'data-menu-item': '' } as Record<string, unknown>),
    })
  }

  return (
    <button type="button" role="menuitem" data-menu-item className={className} onClick={onSelect}>
      {children}
    </button>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-text-faint">{children}</div>
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" role="separator" />
}
