import { useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  TextInput,
  useToast,
} from '@/components/ui'
import { QueueIcon } from '@/components/icons'
import { formatCurrency } from '@/components/charts'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import {
  useAddServicePart,
  useRemoveServicePart,
  useServiceRecordParts,
  useUpdateServicePart,
} from '../api'
import type { ServicePart } from '../types'

/**
 * Parts fitted on a job.
 *
 * `totalCost` is computed from quantity × unit cost rather than typed: it is
 * what the record's `partsTotal` sums, and a hand-entered line total that
 * disagrees with its own quantity and price is a discrepancy nobody notices
 * until an invoice is queried.
 */
export function PartsPanel({ recordId, currency }: { recordId: string; currency: string }) {
  const toast = useToast()
  const [editing, setEditing] = useState<ServicePart | 'new' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const parts = useServiceRecordParts(recordId)
  const addPart = useAddServicePart(recordId)
  const updatePart = useUpdateServicePart(recordId)
  const removePart = useRemoveServicePart(recordId)

  const items = parts.data ?? []
  const total = items.reduce((sum, p) => sum + (p.totalCost ?? 0), 0)

  return (
    <Card>
      <CardHeader
        title="Parts"
        description="Components fitted on this job."
        actions={
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="tabnum font-mono text-xs text-text-muted">
                {formatCurrency(total, currency)}
              </span>
            )}
            <Can rule={access.permission(PERMISSIONS.serviceRecord.update)}>
              <Button variant="ghost" size="sm" onClick={() => setEditing('new')}>
                Add part
              </Button>
            </Can>
          </div>
        }
      />

      <CardBody className="p-0">
        {parts.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-12 rounded-input" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={QueueIcon}
            size="sm"
            title="No parts"
            description="Add the components used so they appear on the invoice."
          />
        ) : (
          <ul>
            {items.map((part) => (
              <li
                key={part._id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{part.partName}</div>
                  <div className="truncate text-xs text-text-muted">
                    {part.quantity ?? 1} × {formatCurrency(part.unitCost ?? 0, currency)}
                    {part.partNumber && ` · ${part.partNumber}`}
                    {part.warrantyMonths ? ` · ${part.warrantyMonths}mo warranty` : ''}
                  </div>
                </div>

                <div className="flex flex-none items-center gap-2">
                  <span className="tabnum font-mono text-sm font-semibold">
                    {formatCurrency(part.totalCost ?? 0, currency)}
                  </span>
                  <Can rule={access.permission(PERMISSIONS.serviceRecord.update)}>
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(part)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-critical"
                        onClick={() => setRemoving(part._id ?? null)}
                      >
                        Remove
                      </Button>
                    </>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <PartDialog
        key={editing === 'new' ? 'new' : (editing?._id ?? 'closed')}
        part={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        currency={currency}
        pending={addPart.isPending || updatePart.isPending}
        error={asApiError(addPart.error ?? updatePart.error)?.userMessage}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          const done = {
            onSuccess: () => {
              toast.success(editing === 'new' ? 'Part added' : 'Part updated')
              setEditing(null)
            },
          }
          if (editing === 'new') addPart.mutate(values, done)
          else if (editing?._id) updatePart.mutate({ partId: editing._id, input: values }, done)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        loading={removePart.isPending}
        title="Remove this part?"
        description="The job's parts total will be recalculated without it."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!removing) return
          removePart.mutate(removing, {
            onSuccess: () => {
              toast.success('Part removed')
              setRemoving(null)
            },
            onError: (e) => toast.error('Couldn’t remove part', e.userMessage),
          })
        }}
      />
    </Card>
  )
}

function PartDialog({
  part,
  open,
  currency,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  part?: ServicePart
  open: boolean
  currency: string
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (values: ServicePart) => void
}) {
  const [values, setValues] = useState<ServicePart>({
    partName: part?.partName ?? '',
    partNumber: part?.partNumber ?? '',
    quantity: part?.quantity ?? 1,
    unitCost: part?.unitCost ?? 0,
    warrantyMonths: part?.warrantyMonths,
  })
  const [touched, setTouched] = useState(false)

  // Derived, never typed — see the panel's note.
  const totalCost = (values.quantity ?? 0) * (values.unitCost ?? 0)
  const nameError = values.partName?.trim() ? undefined : 'Part name is required.'
  const qtyError = (values.quantity ?? 0) >= 1 ? undefined : 'Quantity must be at least 1.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={part ? 'Edit part' : 'Add part'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={pending}
            onClick={() => {
              setTouched(true)
              if (nameError || qtyError) return
              onSubmit({ ...values, totalCost })
            }}
          >
            {part ? 'Save' : 'Add part'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Part name" required error={touched ? nameError : undefined}>
          {(props) => (
            <TextInput
              {...props}
              autoFocus
              value={values.partName ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, partName: e.target.value }))}
              placeholder="Front brake pads"
            />
          )}
        </Field>

        <Field label="Part number">
          {(props) => (
            <TextInput
              {...props}
              value={values.partNumber ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, partNumber: e.target.value }))}
              className="font-mono"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" required error={touched ? qtyError : undefined}>
            {(props) => (
              <TextInput
                {...props}
                type="number"
                inputMode="numeric"
                min={1}
                value={values.quantity ?? 1}
                onChange={(e) => setValues((v) => ({ ...v, quantity: Number(e.target.value) }))}
              />
            )}
          </Field>

          <Field label="Unit cost">
            {(props) => (
              <TextInput
                {...props}
                type="number"
                inputMode="decimal"
                min={0}
                value={values.unitCost ?? 0}
                onChange={(e) => setValues((v) => ({ ...v, unitCost: Number(e.target.value) }))}
              />
            )}
          </Field>
        </div>

        <Field label="Warranty (months)">
          {(props) => (
            <TextInput
              {...props}
              type="number"
              inputMode="numeric"
              min={0}
              value={values.warrantyMonths ?? ''}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  warrantyMonths: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          )}
        </Field>

        <div className="flex items-baseline justify-between rounded-input bg-surface-sunken px-3 py-2">
          <span className="text-xs font-semibold text-text-muted">Line total</span>
          <span className="tabnum font-mono text-sm font-semibold">
            {formatCurrency(totalCost, currency)}
          </span>
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Modal>
  )
}
