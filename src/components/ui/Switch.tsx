import { useId } from 'react'
import clsx from 'clsx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

/**
 * A labelled on/off toggle.
 *
 * Built on a real `<input type="checkbox">` rather than a styled `<div>` with
 * a click handler: that gets keyboard activation, the correct role, and the
 * checked state announced, all for free. The visible track and knob are
 * siblings driven by `peer-checked`, so the input can stay in the accessibility
 * tree while being visually replaced.
 *
 * The whole row is the label, so the tap target is the full width rather than
 * a 36px switch — which matters much more on a phone than it looks on a
 * desktop mock.
 */
export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId()

  return (
    <label
      htmlFor={id}
      className={clsx(
        'interactive flex cursor-pointer items-start justify-between gap-4 rounded-input px-3 py-2.5',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-surface-sunken',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-text">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-text-muted">{description}</span>}
      </span>

      <span className="relative mt-0.5 flex-none">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {/* Track */}
        <span
          className={clsx(
            'interactive block h-5 w-9 rounded-pill bg-border',
            'peer-checked:bg-accent',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          )}
          aria-hidden
        />
        {/* Knob */}
        <span
          className="interactive pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface-raised shadow-sm peer-checked:translate-x-4"
          aria-hidden
        />
      </span>
    </label>
  )
}
