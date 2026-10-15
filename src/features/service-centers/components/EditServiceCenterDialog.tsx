import { Modal, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { useUpdateServiceCenter } from '../api'
import type { ServiceCenter } from '../types'
import { ServiceCenterForm } from './ServiceCenterForm'

export function EditServiceCenterDialog({
  center,
  open,
  onClose,
}: {
  center: ServiceCenter
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Edit service center" description={center.name}>
      {open ? <EditBody center={center} onClose={onClose} /> : null}
    </Modal>
  )
}

function EditBody({ center, onClose }: { center: ServiceCenter; onClose: () => void }) {
  const toast = useToast()
  const update = useUpdateServiceCenter(center._id)

  return (
    <ServiceCenterForm
      center={center}
      submitLabel="Save changes"
      pending={update.isPending}
      error={asApiError(update.error) ?? undefined}
      onCancel={onClose}
      onSubmit={(input) =>
        update.mutate(input, {
          onSuccess: () => {
            toast.success('Service center updated')
            onClose()
          },
        })
      }
    />
  )
}
