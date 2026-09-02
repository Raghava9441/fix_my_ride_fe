import { useState } from 'react'
import { Button, Field, Modal, TextArea, TextInput, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { useTransferOwnership } from '../api'
import type { Vehicle } from '../types'

interface TransferOwnershipDialogProps {
  vehicle: Vehicle
  open: boolean
  onClose: () => void
}

/**
 * Reassigns a vehicle to a different owner.
 *
 * Consequential enough to warrant its own dialog rather than a field in the
 * edit form: it moves the vehicle out of one person's list and into another's,
 * and it appends to an immutable ownership history. Burying that among
 * "colour" and "transmission" invites it being changed by accident.
 */
export function TransferOwnershipDialog({ vehicle, open, onClose }: TransferOwnershipDialogProps) {
  const toast = useToast()
  const transfer = useTransferOwnership(vehicle._id)

  const [newOwnerId, setNewOwnerId] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const apiError = asApiError(transfer.error)
  const missingOwner = !newOwnerId.trim()

  const submit = () => {
    setTouched(true)
    if (missingOwner) return

    transfer.mutate(
      { newOwnerId: newOwnerId.trim(), transferReason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Ownership transferred')
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer ownership"
      description={`${vehicle.make} ${vehicle.model} · ${vehicle.registrationNumber}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={transfer.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={transfer.isPending}>
            Transfer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-input bg-warning-bg px-3 py-2 text-xs text-warning">
          The vehicle moves to the new owner immediately and leaves the current owner's list. The
          previous ownership stays on record.
        </p>

        {/*
          An id field rather than a picker, deliberately: there is no endpoint
          that searches owners by name, and inventing one here would mean
          listing every owner in the tenant into a dropdown. A picker belongs
          here once the API can search — this is the honest version until then.
        */}
        <Field
          label="New owner ID"
          required
          error={touched && missingOwner ? 'An owner ID is required.' : undefined}
          hint="Find this on the customer's profile."
        >
          {(props) => (
            <TextInput
              {...props}
              autoFocus
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              placeholder="6a8e939a0ee9d28a9eff0319"
              autoComplete="off"
              className="font-mono"
            />
          )}
        </Field>

        <Field label="Reason" hint="Optional. Recorded in the ownership history.">
          {(props) => (
            <TextArea
              {...props}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Sold to new owner"
            />
          )}
        </Field>

        {apiError && <p className="text-sm text-critical">{apiError.userMessage}</p>}
      </div>
    </Modal>
  )
}
