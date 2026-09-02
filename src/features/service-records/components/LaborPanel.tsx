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
import { WrenchIcon } from '@/components/icons'
import { formatCurrency } from '@/components/charts'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import {
  useAddServiceLabor,
  useRemoveServiceLabor,
  useServiceRecordLabor,
  useUpdateServiceLabor,
} from '../api'
import type { ServiceLabor } from '../types'

/**
 * Labour lines.
 *
 * Like parts, the line total is derived from hours × rate rather than typed.
 * The server re-derives `cost.laborTotal` from these lines on every change,
 * so a typed total that disagreed with its own inputs would simply be
 * overwritten — better not to offer the field at all.
 *
 * Worth knowing about existing data: records created before itemised labour
 * carry a flat `cost.laborTotal` with no lines behind it. Adding the first
 * line here replaces that figure, because the lines become the source of
 * truth. That is the intended model, but it does mean a legacy total can
 * change the first time someone itemises it.
 */
export function LaborPanel({
  recordId,
  currency,
  laborTotal = 0,
}: {
  recordId: string
  currency: string
  /** The record's `cost.laborTotal`, used to detect a legacy flat figure. */
  laborTotal?: number
}) {
  const toast = useToast()
  const [editing, setEditing] = useState<ServiceLabor | 'new' | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const labor = useServiceRecordLabor(recordId)
  const addLabor = useAddServiceLabor(recordId)
  const updateLabor = useUpdateServiceLabor(recordId)
  const removeLabor = useRemoveServiceLabor(recordId)

  const items = labor.data ?? []
  const total = items.reduce((sum, l) => sum + (l.total ?? 0), 0)
  const hours = items.reduce((sum, l) => sum + (l.hours ?? 0), 0)

  return (
    <Card>
      <CardHeader
        title="Labour"
        description="Time booked against this job."
        actions={
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <span className="tabnum font-mono text-xs text-text-muted">
                {hours}h · {formatCurrency(total, currency)}
              </span>
            )}
            <Can rule={access.permission(PERMISSIONS.serviceRecord.update)}>
              <Button variant="ghost" size="sm" onClick={() => setEditing('new')}>
                Add labour
              </Button>
            </Can>
          </div>
        }
      />

      <CardBody className="p-0">
        {labor.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-12 rounded-input" />
            ))}
          </div>
        ) : items.length === 0 ? (
          /*
           * A record can carry a labour total with no lines behind it — it
           * predates itemised labour. Saying only "no labour recorded" while
           * the Costs card beside it shows a labour charge reads as a bug, so
           * name the situation instead.
           */
          <EmptyState
            icon={WrenchIcon}
            size="sm"
            title={laborTotal > 0 ? 'Not itemised' : 'No labour recorded'}
            description={
              laborTotal > 0
                ? `This job carries a labour charge of ${formatCurrency(laborTotal, currency)} that predates itemised lines. Adding a line replaces that figure with the sum of the lines.`
                : 'Add the time spent so it appears on the invoice.'
            }
          />
        ) : (
          <ul>
            {items.map((line) => (
              <li
                key={line._id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{line.description}</div>
                  <div className="tabnum truncate text-xs text-text-muted">
                    {line.hours}h × {formatCurrency(line.rate ?? 0, currency)}/h
                  </div>
                </div>

                <div className="flex flex-none items-center gap-2">
                  <span className="tabnum font-mono text-sm font-semibold">
                    {formatCurrency(line.total ?? 0, currency)}
                  </span>
                  <Can rule={access.permission(PERMISSIONS.serviceRecord.update)}>
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(line)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-critical"
                        onClick={() => setRemoving(line._id ?? null)}
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

      <LaborDialog
        key={editing === 'new' ? 'new' : (editing?._id ?? 'closed')}
        line={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        currency={currency}
        pending={addLabor.isPending || updateLabor.isPending}
        error={asApiError(addLabor.error ?? updateLabor.error)?.userMessage}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          const done = {
            onSuccess: () => {
              toast.success(editing === 'new' ? 'Labour added' : 'Labour updated')
              setEditing(null)
            },
          }
          if (editing === 'new') addLabor.mutate(values, done)
          else if (editing?._id) updateLabor.mutate({ laborId: editing._id, input: values }, done)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        loading={removeLabor.isPending}
        title="Remove this labour line?"
        description="The job's labour total will be recalculated without it."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!removing) return
          removeLabor.mutate(removing, {
            onSuccess: () => {
              toast.success('Labour removed')
              setRemoving(null)
            },
            onError: (e) => toast.error('Couldn’t remove labour', e.userMessage),
          })
        }}
      />
    </Card>
  )
}

function LaborDialog({
  line,
  open,
  currency,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  line?: ServiceLabor
  open: boolean
  currency: string
  pending: boolean
  error?: string
  onClose: () => void
  onSubmit: (values: ServiceLabor) => void
}) {
  const [values, setValues] = useState<ServiceLabor>({
    description: line?.description ?? '',
    hours: line?.hours ?? 1,
    rate: line?.rate ?? 0,
  })
  const [touched, setTouched] = useState(false)

  const total = (values.hours ?? 0) * (values.rate ?? 0)
  const descError = values.description?.trim() ? undefined : 'Describe the work done.'
  const hoursError = (values.hours ?? 0) > 0 ? undefined : 'Hours must be more than zero.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={line ? 'Edit labour' : 'Add labour'}
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
              if (descError || hoursError) return
              onSubmit({ ...values, total })
            }}
          >
            {line ? 'Save' : 'Add labour'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Description" required error={touched ? descError : undefined}>
          {(props) => (
            <TextInput
              {...props}
              autoFocus
              value={values.description ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Replace front brake pads and bed in"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours" required error={touched ? hoursError : undefined}>
            {(props) => (
              <TextInput
                {...props}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.25}
                value={values.hours ?? 0}
                onChange={(e) => setValues((v) => ({ ...v, hours: Number(e.target.value) }))}
              />
            )}
          </Field>

          <Field label="Rate per hour">
            {(props) => (
              <TextInput
                {...props}
                type="number"
                inputMode="decimal"
                min={0}
                value={values.rate ?? 0}
                onChange={(e) => setValues((v) => ({ ...v, rate: Number(e.target.value) }))}
              />
            )}
          </Field>
        </div>

        <div className="flex items-baseline justify-between rounded-input bg-surface-sunken px-3 py-2">
          <span className="text-xs font-semibold text-text-muted">Line total</span>
          <span className="tabnum font-mono text-sm font-semibold">
            {formatCurrency(total, currency)}
          </span>
        </div>

        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Modal>
  )
}
