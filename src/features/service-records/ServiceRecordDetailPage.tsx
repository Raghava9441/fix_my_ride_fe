import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DescriptionList,
  EmptyState,
  Menu,
  MenuItem,
  MenuSeparator,
  useToast,
} from '@/components/ui'
import { AlertIcon, ChevronDownIcon, InvoiceIcon } from '@/components/icons'
import { DEFAULT_CURRENCY, STATUS_STYLES, formatCurrency, humanizeServiceType } from '@/components/charts'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { isPopulated, refId } from '@/lib/api'
import { asApiError } from '@/lib/queryClient'
import { ROUTE_PATHS, to } from '@/lib/routing'
import {
  useDeleteServiceRecord,
  useGenerateInvoice,
  useServiceRecord,
  useUpdateServiceRecordStatus,
} from './api'
import { PartsPanel } from './components/PartsPanel'
import { LaborPanel } from './components/LaborPanel'
import { FeedbackPanel } from './components/FeedbackPanel'
import { NextServicePanel } from './components/NextServicePanel'
import type { ServiceStatus } from './types'

/**
 * The order work actually moves through. Used to offer only the transitions
 * that make sense from where the job is now, rather than a flat list of every
 * status — "cancel a completed job" and "re-schedule a cancelled one" are the
 * kind of options that only exist because a dropdown was easy.
 */
const NEXT_STATUSES: Record<ServiceStatus, ServiceStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['scheduled'],
}

export default function ServiceRecordDetailPage() {
  const { serviceRecordId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: record, isLoading, isError, error } = useServiceRecord(serviceRecordId)
  const updateStatus = useUpdateServiceRecordStatus(serviceRecordId)
  const generateInvoice = useGenerateInvoice(serviceRecordId)
  const deleteRecord = useDeleteServiceRecord()

  const apiError = asApiError(error)

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Service record" backTo={ROUTE_PATHS.serviceRecords} backLabel="All records" />
        <Card>
          <EmptyState
            icon={AlertIcon}
            title={apiError?.kind === 'not_found' ? 'Record not found' : 'Couldn’t load this record'}
            description={
              apiError?.kind === 'not_found'
                ? 'It may have been deleted, or the link may be wrong.'
                : (apiError?.userMessage ?? 'Try again in a moment.')
            }
          />
        </Card>
      </div>
    )
  }

  if (isLoading || !record) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title={<span className="skeleton inline-block h-6 w-56 align-middle" />}
          backTo={ROUTE_PATHS.serviceRecords}
          backLabel="All records"
        />
        <div className="skeleton h-64 rounded-card" />
      </div>
    )
  }

  const style = STATUS_STYLES[record.status]
  const vehicle = isPopulated(record.vehicleId) ? record.vehicleId : null
  const vehicleId = refId(record.vehicleId)
  const center = isPopulated(record.serviceCenterId) ? record.serviceCenterId : null
  const currency = record.cost?.currency ?? DEFAULT_CURRENCY
  const transitions = NEXT_STATUSES[record.status] ?? []

  const invoiced = Boolean(record.cost?.invoiceNumber)
  const canInvoice = record.status === 'completed' && !invoiced

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={humanizeServiceType(record.serviceType)}
        backTo={ROUTE_PATHS.serviceRecords}
        backLabel="All records"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {vehicle && vehicleId ? (
              <Link to={to.vehicleDetail(vehicleId)} className="font-semibold text-text underline-offset-2 hover:underline">
                {`${vehicle.make ?? ''} ${vehicle.model ?? ''}`.trim() || vehicle.registrationNumber}
              </Link>
            ) : null}
            {vehicle?.registrationNumber && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{vehicle.registrationNumber}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span>{new Date(record.serviceDate).toLocaleDateString()}</span>
            {center?.name && (
              <>
                <span aria-hidden>·</span>
                <span>{center.name}</span>
              </>
            )}
          </span>
        }
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              <span style={{ color: style.color }}>{style.label}</span>
            </Badge>
            {invoiced && <Badge tone="success">Invoiced</Badge>}
            {record.cost?.paymentStatus && (
              <Badge tone={record.cost.paymentStatus === 'paid' ? 'success' : 'warning'}>
                {record.cost.paymentStatus}
              </Badge>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {/*
              Only the transitions that are legal from the current status.
              A completed job has none, so the button disappears rather than
              offering a move that would be rejected.
            */}
            {transitions.length > 0 && (
              <Can rule={access.permission(PERMISSIONS.serviceRecord.update)}>
                <Menu
                  trigger={
                    <Button variant="secondary" size="sm">
                      Move to
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </Button>
                  }
                >
                  {transitions.map((next) => (
                    <MenuItem
                      key={next}
                      danger={next === 'cancelled'}
                      onSelect={() =>
                        updateStatus.mutate(next, {
                          onSuccess: () => toast.success(`Moved to ${STATUS_STYLES[next].label}`),
                          onError: (e) => toast.error('Couldn’t update status', e.userMessage),
                        })
                      }
                    >
                      {STATUS_STYLES[next].label}
                    </MenuItem>
                  ))}
                </Menu>
              </Can>
            )}

            <Menu
              trigger={
                <Button variant="secondary" size="sm" aria-label="Record actions">
                  Actions
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </Button>
              }
            >
              <Can rule={access.permission(PERMISSIONS.billing.manage)}>
                <MenuItem
                  onSelect={() => {
                    if (!canInvoice) {
                      toast.error(
                        invoiced ? 'Already invoiced' : 'Complete the job first',
                        invoiced
                          ? `Invoice ${record.cost?.invoiceNumber}`
                          : 'An invoice can only be raised for completed work.',
                      )
                      return
                    }
                    generateInvoice.mutate(undefined, {
                      onSuccess: () => toast.success('Invoice generated'),
                      onError: (e) => toast.error('Couldn’t generate invoice', e.userMessage),
                    })
                  }}
                >
                  Generate invoice
                </MenuItem>
              </Can>

              <Can rule={access.permission(PERMISSIONS.serviceRecord.delete)}>
                <MenuSeparator />
                <MenuItem danger onSelect={() => setConfirmingDelete(true)}>
                  Delete record
                </MenuItem>
              </Can>
            </Menu>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader title="Job" description="What was booked in." />
            <CardBody className="flex flex-col gap-4">
              <p className="text-sm text-text">{record.description}</p>
              <DescriptionList
                columns={3}
                items={[
                  { label: 'Type', value: humanizeServiceType(record.serviceType) },
                  { label: 'Date', value: new Date(record.serviceDate).toLocaleDateString() },
                  {
                    label: 'Odometer',
                    value: record.odometerReading ? (
                      <span className="tabnum font-mono">
                        {record.odometerReading.value.toLocaleString()}{' '}
                        {record.odometerReading.unit ?? 'km'}
                      </span>
                    ) : undefined,
                  },
                  { label: 'Invoice', value: record.cost?.invoiceNumber },
                  { label: 'Payment', value: record.cost?.paymentStatus },
                  { label: 'Center', value: center?.name },
                ]}
              />
            </CardBody>
          </Card>

          <PartsPanel recordId={serviceRecordId} currency={currency} />
          <LaborPanel
            recordId={serviceRecordId}
            currency={currency}
            laborTotal={record.cost?.laborTotal ?? 0}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Costs" description="Derived from parts and labour." />
            <CardBody className="flex flex-col gap-2 text-sm">
              <CostRow label="Parts" value={record.cost?.partsTotal ?? 0} currency={currency} />
              <CostRow label="Labour" value={record.cost?.laborTotal ?? 0} currency={currency} />
              <div className="my-1 h-px bg-border" />
              <CostRow label="Subtotal" value={record.cost?.subtotal ?? 0} currency={currency} />
              <CostRow label="Tax" value={record.cost?.tax ?? 0} currency={currency} />
              {(record.cost?.discount ?? 0) > 0 && (
                <CostRow
                  label="Discount"
                  value={-(record.cost?.discount ?? 0)}
                  currency={currency}
                />
              )}
              <div className="my-1 h-px bg-border" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <span className="tabnum font-mono text-lg font-semibold">
                  {formatCurrency(record.cost?.total ?? 0, currency)}
                </span>
              </div>

              {canInvoice && (
                <Can rule={access.permission(PERMISSIONS.billing.manage)}>
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    loading={generateInvoice.isPending}
                    onClick={() =>
                      generateInvoice.mutate(undefined, {
                        onSuccess: () => toast.success('Invoice generated'),
                        onError: (e) => toast.error('Couldn’t generate invoice', e.userMessage),
                      })
                    }
                  >
                    <InvoiceIcon className="h-4 w-4" />
                    Generate invoice
                  </Button>
                </Can>
              )}
            </CardBody>
          </Card>

          <NextServicePanel recordId={serviceRecordId} />
          <FeedbackPanel recordId={serviceRecordId} status={record.status} />
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        loading={deleteRecord.isPending}
        title="Delete this service record?"
        description="The job, its parts, and its labour lines will be removed. This can’t be undone."
        confirmLabel="Delete record"
        onConfirm={() =>
          deleteRecord.mutate(serviceRecordId, {
            onSuccess: () => {
              toast.success('Service record deleted')
              navigate(ROUTE_PATHS.serviceRecords, { replace: true })
            },
            onError: (e) => toast.error('Couldn’t delete', e.userMessage),
          })
        }
      />
    </div>
  )
}

function CostRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="tabnum font-mono">{formatCurrency(value, currency)}</span>
    </div>
  )
}
