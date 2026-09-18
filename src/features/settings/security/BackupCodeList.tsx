import { useState } from 'react'
import { Alert, Button } from '@/components/ui'

/**
 * Shows recovery codes once, with a way to get them off the screen.
 *
 * These are single-use credentials that the server will never show again —
 * it stores them and returns them only at the moment they are generated. So
 * the component's real job is to make "I have saved these" an explicit act
 * rather than an assumption, which is why the acknowledgement is a checkbox
 * the caller can gate on and not just a close button.
 *
 * Copy is offered instead of download: a `.txt` of live credentials in the
 * Downloads folder is a worse resting place than a password manager, and the
 * download path also needs an object URL that has to be revoked.
 */
export function BackupCodeList({
  codes,
  onAcknowledge,
}: {
  codes: string[]
  onAcknowledge?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      // Reverts so the button doesn't claim a stale success if the user
      // copies something else and comes back to it.
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard denied or unavailable (insecure context, permissions).
      // The codes are on screen and selectable, so there is nothing to
      // recover from — don't manufacture an error state for it.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="warning" title="Save these now">
        Each code works once. This is the only time they will be shown — if you lose
        them, generate a new set, which replaces these.
      </Alert>

      <ul className="grid grid-cols-2 gap-2 rounded-input bg-surface-sunken p-3 sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="font-mono text-sm tracking-wider text-text">
            {code}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy codes'}
        </Button>
      </div>

      {onAcknowledge ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <label className="flex items-start gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>I have saved these recovery codes somewhere safe.</span>
          </label>

          <div>
            <Button type="button" disabled={!confirmed} onClick={onAcknowledge}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
