import { useState, type FormEvent } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  Modal,
  TextInput,
  useToast,
} from '@/components/ui'
import { ShieldIcon } from '@/components/icons'
import { authErrorMessage, errorReference } from '@/features/auth/authErrors'
import {
  useDisableMfa,
  useEnableMfa,
  useRegenerateBackupCodes,
  useSetupMfa,
} from '@/features/auth/api'
import type { MfaSetupResult } from '@/features/auth/api/service'
import { BackupCodeList } from './BackupCodeList'
import { formatEntryKey, manualEntryKey } from './otpauth'

/**
 * Two-factor authentication: enrol, disable, and replace recovery codes.
 *
 * Enrolment is two server calls, not one, and the order matters. `setup`
 * writes a secret and returns it; `enable` only flips `mfaEnabled` once the
 * user has proved their app is working by returning a live code. Enabling on
 * `setup` alone would lock out anyone whose enrolment silently failed — they
 * would be required to produce codes from a secret their app never stored.
 *
 * The enrolment runs in a modal because the setup key and the recovery codes
 * are shown exactly once. A screen the user can navigate away from mid-flow
 * loses them, and the only recovery is to start over with a new secret.
 */
export function MfaCard({ mfaEnabled }: { mfaEnabled: boolean }) {
  const toast = useToast()

  const setup = useSetupMfa()
  const enable = useEnableMfa()
  const disable = useDisableMfa()
  const regenerate = useRegenerateBackupCodes()

  /** Enrolment: the setup payload, then the codes to record. */
  const [enrolment, setEnrolment] = useState<MfaSetupResult | null>(null)
  const [savedCodes, setSavedCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState('')

  const [disableOpen, setDisableOpen] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null)

  const entryKey = manualEntryKey(enrolment?.otpauthUrl)

  function beginEnrolment() {
    setup.mutate(undefined, {
      onSuccess: (result) => {
        setEnrolment(result)
        setCode('')
      },
    })
  }

  function closeEnrolment() {
    // Reset every piece of enrolment state together. Leaving a stale secret
    // or a half-typed code behind means the next attempt starts mid-flow.
    setEnrolment(null)
    setSavedCodes(null)
    setCode('')
    enable.reset()
    setup.reset()
  }

  function submitEnrolment(event: FormEvent) {
    event.preventDefault()
    if (code.trim().length === 0 || enable.isPending) return

    enable.mutate(code.trim(), {
      onSuccess: () => {
        // Hold the codes from the setup response — this is the only moment
        // they exist client-side, and the enable response does not repeat them.
        setSavedCodes(enrolment?.backupCodes ?? [])
        toast.success('Two-factor authentication enabled')
      },
    })
  }

  function submitDisable(event: FormEvent) {
    event.preventDefault()
    if (disableCode.trim().length === 0 || disable.isPending) return

    disable.mutate(
      { code: disableCode.trim() },
      {
        onSuccess: () => {
          setDisableOpen(false)
          setDisableCode('')
          toast.success('Two-factor authentication disabled')
        },
      },
    )
  }

  function confirmRegenerate() {
    regenerate.mutate(undefined, {
      onSuccess: (result) => {
        setRegenerateOpen(false)
        setFreshCodes(result.backupCodes)
      },
    })
  }

  return (
    <>
      <Card>
        <CardHeader
          title="Two-factor authentication"
          description="Require a code from your authenticator app when signing in."
          actions={<Badge tone={mfaEnabled ? 'success' : 'neutral'}>{mfaEnabled ? 'On' : 'Off'}</Badge>}
        />
        <CardBody className="flex flex-col gap-4">
          {setup.error ? (
            <Alert tone="critical" reference={errorReference(setup.error)}>
              {authErrorMessage(setup.error, 'Could not start setup.')}
            </Alert>
          ) : null}

          {regenerate.error ? (
            <Alert tone="critical" reference={errorReference(regenerate.error)}>
              {authErrorMessage(regenerate.error, 'Could not generate new recovery codes.')}
            </Alert>
          ) : null}

          {mfaEnabled ? (
            <>
              <div className="flex items-start gap-3 rounded-input bg-surface-sunken p-3">
                <ShieldIcon className="mt-0.5 size-4 shrink-0 text-success" />
                <p className="text-sm text-text-muted">
                  Your account asks for a six-digit code at sign-in. You will need your
                  authenticator app — or a recovery code — to get in.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setRegenerateOpen(true)}>
                  New recovery codes
                </Button>
                <Button type="button" variant="danger" onClick={() => setDisableOpen(true)}>
                  Turn off
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="max-w-prose text-sm text-text-muted">
                A password alone can be phished or reused. With two-factor on, signing in
                also needs a code from an app on your phone, which an attacker with your
                password does not have.
              </p>

              <div>
                <Button type="button" onClick={beginEnrolment} loading={setup.isPending}>
                  Set up
                </Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* ---------------- enrolment ---------------- */}
      <Modal
        open={enrolment !== null}
        onClose={closeEnrolment}
        title={savedCodes ? 'Save your recovery codes' : 'Set up two-factor authentication'}
        description={
          savedCodes
            ? undefined
            : 'Add the key below to your authenticator app, then enter the code it shows.'
        }
      >
        {savedCodes ? (
          <BackupCodeList codes={savedCodes} onAcknowledge={closeEnrolment} />
        ) : (
          <form className="flex flex-col gap-4" onSubmit={submitEnrolment} noValidate>
            {entryKey ? (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-faint">
                  Setup key
                </span>
                <code className="select-all rounded-input bg-surface-sunken p-3 font-mono text-sm tracking-wider text-text">
                  {formatEntryKey(entryKey)}
                </code>
                <p className="text-xs text-text-muted">
                  Enter this in your authenticator app.{' '}
                  {/* On a phone the app is on this device, so the URI can hand
                      the enrolment straight over and skip the typing. */}
                  <a className="interactive font-semibold text-accent" href={enrolment?.otpauthUrl}>
                    Or open it directly
                  </a>
                  .
                </p>
              </div>
            ) : (
              <Alert tone="critical">
                Setup key missing from the server response. Close this and try again.
              </Alert>
            )}

            {enable.error ? (
              <Alert tone="critical" reference={errorReference(enable.error)}>
                {authErrorMessage(enable.error, 'That code was not accepted.')}
              </Alert>
            ) : null}

            <Field label="Code from your app" required>
              {(props) => (
                <TextInput
                  {...props}
                  // `one-time-code` lets iOS and Android offer the code from
                  // the authenticator directly above the keyboard.
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              )}
            </Field>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={code.trim().length === 0 || !entryKey}
                loading={enable.isPending}
              >
                Verify and turn on
              </Button>
              <Button type="button" variant="ghost" onClick={closeEnrolment}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ---------------- disable ---------------- */}
      <Modal
        open={disableOpen}
        onClose={() => {
          setDisableOpen(false)
          setDisableCode('')
          disable.reset()
        }}
        title="Turn off two-factor authentication"
        description="Enter a current code from your authenticator app to confirm."
        size="sm"
      >
        <form className="flex flex-col gap-4" onSubmit={submitDisable} noValidate>
          <Alert tone="warning">
            Your account will be protected by its password alone, and your recovery codes
            will stop working.
          </Alert>

          {disable.error ? (
            <Alert tone="critical" reference={errorReference(disable.error)}>
              {authErrorMessage(disable.error, 'That code was not accepted.')}
            </Alert>
          ) : null}

          <Field label="Code from your app" required>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
              />
            )}
          </Field>

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              disabled={disableCode.trim().length === 0}
              loading={disable.isPending}
            >
              Turn off
            </Button>
          </div>
        </form>
      </Modal>

      {/* ---------------- regenerate recovery codes ---------------- */}
      <ConfirmDialog
        open={regenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        onConfirm={confirmRegenerate}
        title="Generate new recovery codes?"
        description="Your existing recovery codes stop working immediately. Your authenticator app is not affected and keeps working."
        confirmLabel="Generate"
      />

      <Modal
        open={freshCodes !== null}
        onClose={() => setFreshCodes(null)}
        title="Your new recovery codes"
      >
        {freshCodes ? (
          <BackupCodeList codes={freshCodes} onAcknowledge={() => setFreshCodes(null)} />
        ) : null}
      </Modal>
    </>
  )
}
