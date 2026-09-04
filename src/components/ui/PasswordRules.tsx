import clsx from 'clsx'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { PASSWORD_RULES } from '@/lib/auth/passwordPolicy'

/**
 * The live checklist of password rules.
 *
 * Shown *before* the user submits, not after it's rejected. The rules are the
 * server's actual four (see lib/auth/passwordPolicy.ts), so nothing here can
 * pass while the API rejects it.
 *
 * `aria-live="polite"` on the list, with each item carrying its own met/unmet
 * text, so a screen-reader user gets told a rule was satisfied as they type
 * rather than having to submit to find out. Colour is never the only signal —
 * each row has an icon and its state is in the accessible name.
 */
export function PasswordRules({ password, className }: { password: string; className?: string }) {
  return (
    <ul aria-live="polite" className={clsx('flex flex-col gap-1', className)}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={clsx('flex items-center gap-1.5 text-xs', met ? 'text-success' : 'text-text-faint')}
          >
            <span className="flex h-3.5 w-3.5 flex-none items-center justify-center">
              {met ? <CheckIcon className="h-3.5 w-3.5" /> : <CloseIcon className="h-3 w-3" />}
            </span>
            <span>{rule.label}</span>
            <span className="sr-only">{met ? '— met' : '— not yet met'}</span>
          </li>
        )
      })}
    </ul>
  )
}
