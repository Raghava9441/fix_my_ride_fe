import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Field,
  Modal,
  SelectInput,
  TextInput,
  useToast,
} from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { useAccounts } from '@/features/accounts/api'
import { useRoles } from '@/features/roles/api'
import { useServiceCenters } from '@/features/service-centers/api'
import { useCreateStaff } from '../api'
import { EMPLOYMENT_TYPE_LABEL } from '../staffMember'
import type { EmploymentType } from '../types'

const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contractor', 'intern']

/**
 * Attaches an existing account to a service center as staff.
 *
 * ---- Why this picks an account rather than inviting one ----
 *
 * `POST /staff` requires an `accountId` that already exists; it has no path
 * that creates a login. Someone who has never signed up has to come through
 * Invitations first, which mints the account, and only then can be made
 * staff here. The dialog says so rather than offering an email field that
 * would 422 for exactly the people an admin is most likely to type in.
 */
export function AddStaffDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add staff"
      description="Give an existing account access to a service center."
    >
      {/* The body is a separate component so its three lookup queries mount
          with the dialog rather than with the page. `Modal` keeps children
          mounted when closed, so leaving the hooks inline would fetch every
          account, role and service center on a screen most visits never open
          this from. */}
      {open ? <AddStaffForm onClose={onClose} /> : null}
    </Modal>
  )
}

function AddStaffForm({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const createStaff = useCreateStaff()

  const accounts = useAccounts({ limit: 100 })
  const roles = useRoles({ limit: 100 })
  const centers = useServiceCenters({ limit: 100 })

  const [values, setValues] = useState({
    accountId: '',
    serviceCenterId: '',
    roleId: '',
    employeeId: '',
    employmentType: 'full_time' as EmploymentType,
    joinedAt: '',
  })

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((prev) => ({ ...prev, [key]: event.target.value }))

  const apiError = asApiError(createStaff.error)
  const canSubmit =
    values.accountId !== '' &&
    values.serviceCenterId !== '' &&
    values.roleId !== '' &&
    !createStaff.isPending

  function close() {
    setValues({
      accountId: '',
      serviceCenterId: '',
      roleId: '',
      employeeId: '',
      employmentType: 'full_time',
      joinedAt: '',
    })
    createStaff.reset()
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    createStaff.mutate(
      {
        accountId: values.accountId,
        serviceCenterId: values.serviceCenterId,
        roleId: values.roleId,
        // Empty strings are omitted rather than sent: the schema treats an
        // empty `employeeId` as a value and would store a blank one.
        employeeId: values.employeeId.trim() || undefined,
        employmentType: values.employmentType,
        joinedAt: values.joinedAt ? new Date(values.joinedAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Staff member added')
          close()
        },
      },
    )
  }

  const lookupsLoading = accounts.isLoading || roles.isLoading || centers.isLoading

  return (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          {apiError ? (
            <Alert tone="critical" reference={apiError.requestId}>
              {apiError.userMessage}
            </Alert>
          ) : null}

          <Field
            label="Account"
            required
            hint="Only people who already have an account appear here. Send an invitation first if theirs is missing."
          >
            {(props) => (
              <SelectInput {...props} value={values.accountId} onChange={set('accountId')} disabled={lookupsLoading}>
                <option value="">{lookupsLoading ? 'Loading…' : 'Select an account'}</option>
                {accounts.data?.items.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.email}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field label="Service center" required>
            {(props) => (
              <SelectInput
                {...props}
                value={values.serviceCenterId}
                onChange={set('serviceCenterId')}
                disabled={lookupsLoading}
              >
                <option value="">{lookupsLoading ? 'Loading…' : 'Select a center'}</option>
                {centers.data?.items.map((center) => (
                  <option key={center._id} value={center._id}>
                    {center.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field label="Role" required hint="Decides what they can do. Extra permissions can be granted later.">
            {(props) => (
              <SelectInput {...props} value={values.roleId} onChange={set('roleId')} disabled={lookupsLoading}>
                <option value="">{lookupsLoading ? 'Loading…' : 'Select a role'}</option>
                {roles.data?.items.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employment type">
              {(props) => (
                <SelectInput {...props} value={values.employmentType} onChange={set('employmentType')}>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {EMPLOYMENT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>

            <Field label="Employee ID" hint="Optional.">
              {(props) => (
                <TextInput {...props} value={values.employeeId} onChange={set('employeeId')} placeholder="e.g. EMP-014" />
              )}
            </Field>
          </div>

          <Field label="Joined" hint="Defaults to today.">
            {(props) => <TextInput {...props} type="date" value={values.joinedAt} onChange={set('joinedAt')} />}
          </Field>

          <div className="flex gap-2">
            <Button type="submit" disabled={!canSubmit} loading={createStaff.isPending}>
              Add staff
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
  )
}
