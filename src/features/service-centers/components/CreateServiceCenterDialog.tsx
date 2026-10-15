import { useNavigate } from 'react-router-dom'
import { Modal, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { to } from '@/lib/routing'
import { useCreateServiceCenter } from '../api'
import { ServiceCenterForm } from './ServiceCenterForm'

export function CreateServiceCenterDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add service center"
      description="Register a new workshop in this workspace."
    >
      {/* Mounted only while open: `Modal` keeps children mounted when closed,
          and a form left mounted would carry stale values into the next use. */}
      {open ? <CreateBody onClose={onClose} /> : null}
    </Modal>
  )
}

function CreateBody({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const create = useCreateServiceCenter()

  return (
    <ServiceCenterForm
      submitLabel="Add center"
      pending={create.isPending}
      error={asApiError(create.error) ?? undefined}
      onCancel={onClose}
      onSubmit={(input) =>
        create.mutate(input, {
          onSuccess: (center) => {
            toast.success('Service center added')
            onClose()
            navigate(to.serviceCenterDetail(center._id))
          },
        })
      }
    />
  )
}
