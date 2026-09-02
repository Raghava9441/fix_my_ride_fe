import { useState } from 'react'
import { Button, Card, CardBody, CardHeader, Field, TextArea, useToast } from '@/components/ui'
import { asApiError } from '@/lib/queryClient'
import { useServiceRecordFeedback, useSubmitServiceFeedback } from '../api'
import type { ServiceStatus } from '../types'

/** Filled stars up to `value`, hollow after. */
function Stars({ value }: { value: number }) {
  return (
    <span className="text-base leading-none" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'text-warning' : 'text-text-faint'}>
          ★
        </span>
      ))}
    </span>
  )
}

/**
 * Customer feedback on a completed job.
 *
 * Only offered once the work is `completed`, mirroring the server's own rule —
 * a rating on a scheduled or cancelled job would be attached to a service
 * nobody performed. Showing the form and letting the API reject it would be
 * the same restriction expressed as a failure.
 */
export function FeedbackPanel({ recordId, status }: { recordId: string; status: ServiceStatus }) {
  const toast = useToast()
  const feedback = useServiceRecordFeedback(recordId)
  const submit = useSubmitServiceFeedback(recordId)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [touched, setTouched] = useState(false)

  const apiError = asApiError(submit.error)
  const existing = feedback.data
  const hasFeedback = Boolean(existing?.rating)

  if (status !== 'completed' && !hasFeedback) {
    return (
      <Card>
        <CardHeader title="Feedback" />
        <CardBody>
          <p className="text-xs text-text-muted">
            Available once the job is marked completed.
          </p>
        </CardBody>
      </Card>
    )
  }

  if (hasFeedback) {
    return (
      <Card>
        <CardHeader title="Feedback" />
        <CardBody className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Stars value={existing?.rating ?? 0} />
            {/* The number as well as the stars — colour and shape alone
                don't survive a screen reader. */}
            <span className="tabnum font-mono text-sm font-semibold">{existing?.rating}/5</span>
          </div>
          {existing?.comment && <p className="text-sm text-text">{existing.comment}</p>}
          {existing?.submittedAt && (
            <p className="text-[11px] text-text-faint">
              Submitted {new Date(existing.submittedAt).toLocaleDateString()}
            </p>
          )}
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader title="Feedback" description="How did the customer rate this job?" />
      <CardBody className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[11px] font-bold uppercase tracking-wide text-text-faint">
            Rating
          </legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={rating === n}
                className={
                  n <= rating
                    ? 'interactive rounded-input px-1 text-xl leading-none text-warning'
                    : 'interactive rounded-input px-1 text-xl leading-none text-text-faint hover:text-text-muted'
                }
              >
                ★
              </button>
            ))}
          </div>
          {touched && rating === 0 && (
            <p className="text-xs font-medium text-critical">Choose a rating.</p>
          )}
        </fieldset>

        <Field label="Comment" error={touched && !comment.trim() ? 'Add a short comment.' : undefined}>
          {(props) => (
            <TextArea
              {...props}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Work completed on time and explained clearly."
              maxLength={1000}
            />
          )}
        </Field>

        <Button
          size="sm"
          loading={submit.isPending}
          onClick={() => {
            setTouched(true)
            // Both are required by the server's schema, so check both rather
            // than let it come back as a 422 with no field attached.
            if (rating === 0 || !comment.trim()) return
            submit.mutate(
              { rating, comment: comment.trim() },
              { onSuccess: () => toast.success('Feedback recorded') },
            )
          }}
        >
          Submit feedback
        </Button>

        {apiError && <p className="text-sm text-critical">{apiError.userMessage}</p>}
      </CardBody>
    </Card>
  )
}
