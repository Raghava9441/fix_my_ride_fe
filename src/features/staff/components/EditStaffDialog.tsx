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
import { isPopulated } from '@/lib/api'
import { asApiError } from '@/lib/queryClient'
import { useRoles } from '@/features/roles/api'
import { useUpdateStaff } from '../api'
import {
  EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUS_ORDER,
  EMPLOYMENT_TYPE_LABEL,
} from '../staffMember'
import type { EmploymentStatus, EmploymentType, StaffProfile } from '../types'

const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'contractor', 'intern']

/**
 * Edits the employment facts on a staff profile.
 *
 * Deliberately not here: the account and the service center. Moving someone
 * between centers changes who their work is billed to and which records they
 * can reach, and reassigning the account would silently transfer a work
 * history to a different person — both are transfers rather than edits, and
 * neither belongs behind the same unremarkable "Edit details" as a job title.
 */
export function EditStaffDialog({
  staff,
  open,
  onClose,
}: {
  staff: StaffProfile
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Edit staff details">
      {/* `Modal` keeps children mounted when closed, so the body is split out
          to keep its role lookup from firing on every detail page view. */}
      {open ? <EditStaffForm staff={staff} onClose={onClose} /> : null}
    </Modal>
  )
}

function EditStaffForm({ staff, onClose }: { staff: StaffProfile; onClose: () => void }) {
  const toast = useToast()
  const updateStaff = useUpdateStaff(staff._id)
  const roles = useRoles({ limit: 100 })

  const [values, setValues] = useState({
    roleId: isPopulated(staff.roleId) ? staff.roleId._id : (staff.roleId as string),
    employeeId: staff.employeeId ?? '',
    employmentStatus: staff.employmentStatus,
    employmentType: staff.employmentType,
    specializations: (staff.specializations ?? []).join(', '),
  })

  const apiError = asApiError(updateStaff.error)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (updateStaff.isPending) return

    updateStaff.mutate(
      {
        roleId: values.roleId,
        employeeId: values.employeeId.trim() || undefined,
        employmentStatus: values.employmentStatus,
        employmentType: values.employmentType,
        // Split on commas and drop the blanks, so a trailing comma or a
        // double space doesn't store an empty specialization.
        specializations: values.specializations
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      },
      {
        onSuccess: () => {
          toast.success('Staff details updated')
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

      <Field label="Role" required hint="Decides the baseline of what they can do.">
        {(props) => (
          <SelectInput
            {...props}
            value={values.roleId}
            onChange={(e) => setValues((p) => ({ ...p, roleId: e.target.value }))}
            disabled={roles.isLoading}
          >
            {roles.data?.items.map((role) => (
              <option key={role._id} value={role._id}>
                {role.name}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Status"
          hint="Suspended and terminated both remove access; terminated also ends employment."
        >
          {(props) => (
            <SelectInput
              {...props}
              value={values.employmentStatus}
              onChange={(e) =>
                setValues((p) => ({ ...p, employmentStatus: e.target.value as EmploymentStatus }))
              }
            >
              {EMPLOYMENT_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {EMPLOYMENT_STATUS[status].label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="Employment type">
          {(props) => (
            <SelectInput
              {...props}
              value={values.employmentType}
              onChange={(e) =>
                setValues((p) => ({ ...p, employmentType: e.target.value as EmploymentType }))
              }
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EMPLOYMENT_TYPE_LABEL[type]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>

      <Field label="Employee ID" hint="Optional.">
        {(props) => (
          <TextInput
            {...props}
            value={values.employeeId}
            onChange={(e) => setValues((p) => ({ ...p, employeeId: e.target.value }))}
            placeholder="e.g. EMP-014"
          />
        )}
      </Field>

      <Field label="Specializations" hint="Comma separated — e.g. Diagnostics, Electrical.">
        {(props) => (
          <TextInput
            {...props}
            value={values.specializations}
            onChange={(e) => setValues((p) => ({ ...p, specializations: e.target.value }))}
          />
        )}
      </Field>

      <div className="flex gap-2">
        <Button type="submit" loading={updateStaff.isPending}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
