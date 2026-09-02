import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  useToast,
} from '@/components/ui'
import { FolderIcon } from '@/components/icons'
import { Can, PERMISSIONS, access } from '@/lib/access'
import { asApiError } from '@/lib/queryClient'
import { vehicleService } from '../api/service'
import { useAddVehicleDocument, useRemoveVehicleDocument, useVehicleDocuments } from '../api'
import type { VehicleOutletContext } from '../VehicleDetailPage'

/** 1024-based, matching how operating systems report file sizes. */
function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/** Refused before upload rather than after a round trip that would 413. */
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export default function VehicleDocumentsTab() {
  const { vehicleId } = useOutletContext<VehicleOutletContext>()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const documents = useVehicleDocuments(vehicleId)
  const addDocument = useAddVehicleDocument(vehicleId)
  const removeDocument = useRemoveVehicleDocument(vehicleId)
  const apiError = asApiError(documents.error)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('File is too large', `${formatBytes(file.size)} — the limit is 20 MB.`)
      return
    }

    const body = new FormData()
    body.append('file', file)
    body.append('entityType', 'vehicle')
    body.append('entityId', vehicleId)

    addDocument.mutate(body, {
      onSuccess: () => toast.success('Document uploaded', file.name),
      onError: (error) => toast.error('Upload failed', error.userMessage),
      onSettled: () => {
        // Clearing the input matters: without it, selecting the same file
        // again fires no `change` event and the upload silently does nothing.
        if (fileInput.current) fileInput.current.value = ''
      },
    })
  }

  /**
   * Downloads resolve a URL and hand it to the browser rather than pulling
   * bytes through the JSON client, which would buffer the whole file in
   * memory to no benefit.
   */
  const download = async (documentId: string, name: string) => {
    try {
      const { data } = await vehicleService.documentDownloadUrl(vehicleId, documentId)
      if (!data?.url) {
        toast.error('Couldn’t start the download', 'The server returned no file URL.')
        return
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      const failure = asApiError(error)
      toast.error('Couldn’t download', failure?.userMessage ?? name)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Documents"
        description="Registration, insurance, and service paperwork."
        actions={
          <Can rule={access.permission(PERMISSIONS.vehicle.update)}>
            <>
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx"
              />
              <Button
                size="sm"
                loading={addDocument.isPending}
                onClick={() => fileInput.current?.click()}
              >
                Upload
              </Button>
            </>
          </Can>
        }
      />

      <CardBody className="p-0">
        {documents.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14 rounded-input" />
            ))}
          </div>
        ) : documents.isError ? (
          <div className="p-4">
            <p className="text-sm text-critical">
              {apiError?.userMessage ?? 'Couldn’t load documents.'}
            </p>
          </div>
        ) : (documents.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={FolderIcon}
            title="No documents"
            description="Upload the registration certificate, insurance policy, or any service paperwork."
          />
        ) : (
          <ul>
            {documents.data?.map((document) => (
              <li
                key={document._id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-input bg-surface-sunken text-text-muted">
                    <FolderIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{document.originalName}</div>
                    <div className="truncate text-xs text-text-muted">
                      {document.documentType?.replace(/_/g, ' ')} · {formatBytes(document.size)}
                      {document.validUntil &&
                        ` · valid to ${new Date(document.validUntil).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-none items-center gap-2">
                  {document.isVerified && <Badge tone="success">Verified</Badge>}
                  {document.isExpired && <Badge tone="critical">Expired</Badge>}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => download(document._id, document.originalName)}
                  >
                    Download
                  </Button>

                  <Can rule={access.permission(PERMISSIONS.vehicle.update)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-critical"
                      onClick={() => setPendingDelete(document._id)}
                    >
                      Remove
                    </Button>
                  </Can>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        loading={removeDocument.isPending}
        title="Remove this document?"
        description="It will be detached from this vehicle. This can’t be undone."
        confirmLabel="Remove"
        onConfirm={() => {
          if (!pendingDelete) return
          removeDocument.mutate(pendingDelete, {
            onSuccess: () => {
              toast.success('Document removed')
              setPendingDelete(null)
            },
            onError: (error) => toast.error('Couldn’t remove', error.userMessage),
          })
        }}
      />
    </Card>
  )
}
