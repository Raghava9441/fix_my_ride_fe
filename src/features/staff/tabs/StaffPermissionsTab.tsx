import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Modal,
  SelectInput,
  TextInput,
  useToast,
} from '@/components/ui'
import { KeyIcon, LockIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import { usePermissions } from '@/features/roles/api'
import type { StaffOutletContext } from '../StaffDetailPage'
import {
  useGrantStaffPermission,
  useRevokeStaffPermission,
  useStaffMember,
  useStaffPermissions,
} from '../api'
import { humanizePermission, staffRoleName } from '../staffMember'

/**
 * What this person may do, and the overrides on top of their role.
 *
 * ---- Two lists, because they answer different questions ----
 *
 * `GET /staff/:id/permissions` returns the *effective* set — everything the
 * role grants plus everything granted individually, already resolved. That
 * is the answer to "can they do X", and it is what an admin checks first.
 *
 * `customPermissions` on the profile is the *overrides* — the grants someone
 * made by hand, with who made them and why. That is the answer to "why can
 * they do X", and it is the only part that can be taken away here; a
 * permission that comes from the role has to be changed on the role.
 *
 * Showing only the effective set would make every entry look removable.
 * Showing only the overrides would hide most of what they can actually do.
 */
export default function StaffPermissionsTab() {
  const { staffId } = useOutletContext<StaffOutletContext>()
  const toast = useToast()

  const { data: staff } = useStaffMember(staffId)
  const effective = useStaffPermissions(staffId)
  const revoke = useRevokeStaffPermission(staffId)

  const [grantOpen, setGrantOpen] = useState(false)

  const roleName = staff ? staffRoleName(staff) : undefined
  const grants = staff?.customPermissions ?? []
  const denials = staff?.deniedPermissions ?? []
  const apiError = asApiError(effective.error ?? revoke.error)

  /** Override ids, so the effective list can mark which entries came from one. */
  const grantedIds = new Set(
    grants.map((grant) => (typeof grant.permission === 'string' ? grant.permission : '')),
  )

  return (
    <div className="flex flex-col gap-4">
      {revoke.isError ? (
        <Alert tone="critical" reference={apiError?.requestId}>
          {apiError?.userMessage ?? 'Couldn’t revoke that permission.'}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="Effective permissions"
          description={
            roleName
              ? `Everything the ${roleName} role allows, plus any granted individually.`
              : 'Everything this person is currently allowed to do.'
          }
          actions={
            effective.data ? <Badge tone="neutral">{effective.data.length}</Badge> : undefined
          }
        />
        <CardBody>
          {effective.isLoading ? (
            <div className="skeleton h-24 w-full rounded-input" />
          ) : effective.isError ? (
            <p className="text-sm text-critical">
              {apiError?.userMessage ?? 'Couldn’t load permissions.'}
            </p>
          ) : effective.data?.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {effective.data.map((permission) => (
                <li key={permission}>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface-sunken px-2.5 py-1 text-xs"
                    title={permission}
                  >
                    <span className="text-text">{humanizePermission(permission)}</span>
                    {grantedIds.has(permission) ? <Badge tone="info">granted</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">
              This person has no permissions. Their role may not grant any.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Individual grants"
          description="Extra permissions given to this person on top of their role."
          actions={
            <Can rule={access.permission(PERMISSIONS.staffProfile.manage)} mode="disable">
              <Button size="sm" variant="secondary" onClick={() => setGrantOpen(true)}>
                Grant permission
              </Button>
            </Can>
          }
        />

        {grants.length === 0 ? (
          <EmptyState
            icon={KeyIcon}
            title="No individual grants"
            description={
              roleName
                ? `Everything this person can do comes from the ${roleName} role.`
                : 'Everything this person can do comes from their role.'
            }
          />
        ) : (
          grants.map((grant, index) => {
            const id = typeof grant.permission === 'string' ? grant.permission : undefined
            const expired = grant.expiresAt ? new Date(grant.expiresAt) < new Date() : false

            return (
              <div
                key={grant._id ?? id ?? index}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">
                      {id ? humanizePermission(id) : 'Unknown permission'}
                    </span>
                    {expired ? <Badge tone="warning">Expired</Badge> : null}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    Granted {new Date(grant.grantedAt).toLocaleDateString()}
                    {grant.expiresAt
                      ? ` · ${expired ? 'expired' : 'expires'} ${new Date(grant.expiresAt).toLocaleDateString()}`
                      : ''}
                  </div>
                  {grant.reason ? (
                    <p className="mt-1 line-clamp-2 text-xs text-text-faint">{grant.reason}</p>
                  ) : null}
                </div>

                <Can rule={access.permission(PERMISSIONS.staffProfile.manage)}>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!grant._id || revoke.isPending}
                    onClick={() =>
                      grant._id &&
                      revoke.mutate(grant._id, {
                        onSuccess: () => toast.success('Permission revoked'),
                      })
                    }
                  >
                    Revoke
                  </Button>
                </Can>
              </div>
            )
          })
        )}
      </Card>

      {denials.length > 0 && (
        <Card>
          <CardHeader
            title="Denied"
            description="Explicitly withheld, even though the role would allow it."
          />
          {denials.map((denial, index) => {
            const id = typeof denial.permission === 'string' ? denial.permission : undefined
            return (
              <div
                key={denial._id ?? id ?? index}
                className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-b-0"
              >
                <LockIcon className="h-4 w-4 flex-none text-critical" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text">
                    {id ? humanizePermission(id) : 'Unknown permission'}
                  </div>
                  {denial.reason ? (
                    <p className="truncate text-xs text-text-muted">{denial.reason}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <GrantPermissionDialog
        staffId={staffId}
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        alreadyGranted={grantedIds}
      />
    </div>
  )
}

function GrantPermissionDialog({
  staffId,
  open,
  onClose,
  alreadyGranted,
}: {
  staffId: string
  open: boolean
  onClose: () => void
  alreadyGranted: Set<string>
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Grant a permission"
      description="Gives this person one extra permission on top of their role."
    >
      {open ? (
        <GrantPermissionForm staffId={staffId} onClose={onClose} alreadyGranted={alreadyGranted} />
      ) : null}
    </Modal>
  )
}

function GrantPermissionForm({
  staffId,
  onClose,
  alreadyGranted,
}: {
  staffId: string
  onClose: () => void
  alreadyGranted: Set<string>
}) {
  const toast = useToast()
  const grant = useGrantStaffPermission(staffId)
  const permissions = usePermissions({ limit: 200 })

  const [values, setValues] = useState({ permission: '', expiresAt: '', reason: '' })
  const apiError = asApiError(grant.error)

  const options = (permissions.data?.items ?? []).filter(
    (permission) => !alreadyGranted.has(permission._id),
  )

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!values.permission || grant.isPending) return

    grant.mutate(
      {
        permission: values.permission,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : undefined,
        reason: values.reason.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Permission granted')
          onClose()
        },
      },
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {apiError ? (
        <Alert tone="critical" reference={apiError.requestId}>
          {apiError.userMessage}
        </Alert>
      ) : null}

      <Field label="Permission" required>
        {(props) => (
          <SelectInput
            {...props}
            value={values.permission}
            onChange={(e) => setValues((p) => ({ ...p, permission: e.target.value }))}
            disabled={permissions.isLoading}
          >
            <option value="">{permissions.isLoading ? 'Loading…' : 'Select a permission'}</option>
            {options.map((permission) => (
              <option key={permission._id} value={permission._id}>
                {permission.name ?? humanizePermission(permission.key ?? permission._id)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <Field
        label="Expires"
        hint="Optional. Leave empty for a permanent grant — a temporary one is safer for cover and stand-ins."
      >
        {(props) => (
          <TextInput
            {...props}
            type="date"
            value={values.expiresAt}
            onChange={(e) => setValues((p) => ({ ...p, expiresAt: e.target.value }))}
          />
        )}
      </Field>

      <Field label="Reason" hint="Optional, but it is what the next admin reads to decide whether this is still needed.">
        {(props) => (
          <TextInput
            {...props}
            value={values.reason}
            onChange={(e) => setValues((p) => ({ ...p, reason: e.target.value }))}
            placeholder="e.g. covering the service manager until 14 Nov"
          />
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" disabled={!values.permission} loading={grant.isPending}>
          Grant
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
