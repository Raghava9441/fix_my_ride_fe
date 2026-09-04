import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'
import { EyeIcon, EyeOffIcon } from '@/components/icons'
import { TextInput } from './Field'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Which password this is, for the browser's credential manager.
   *
   * There is no sensible default. `current-password` on a signup form makes a
   * password manager offer the old password instead of generating a new one;
   * `new-password` on a sign-in form suppresses autofill entirely. Getting
   * this wrong is invisible in development — you notice when users can't sign
   * in with their saved credentials — so the prop is required.
   */
  autoComplete: 'current-password' | 'new-password' | 'one-time-code'
}

/**
 * A password field with a reveal toggle.
 *
 * The toggle exists because the alternative — a "confirm password" field —
 * is worse on every axis: it doubles the typing, it can't catch a mistake
 * that was made identically twice, and on mobile it is the single most
 * common reason someone abandons a signup. Letting people *see what they
 * typed* solves the actual problem.
 *
 * Two details that matter:
 *
 *   - The toggle is `tabIndex={-1}`. Tabbing out of a password field should
 *     land on the submit button, not on a decoration between them.
 *   - Revealing does not persist across fields or mounts. A password left
 *     visible on a shared workshop terminal is a hazard, and "it was still
 *     showing from last time" is not a state anyone chose.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [revealed, setRevealed] = useState(false)

    return (
      <div className="relative">
        <TextInput
          ref={ref}
          type={revealed ? 'text' : 'password'}
          // Password managers and OS keyboards read these; without them iOS
          // offers autocorrect and capitalisation on a password field.
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={clsx('pr-10', className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          className="interactive absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-input text-text-faint hover:text-text"
        >
          {revealed ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
    )
  },
)
