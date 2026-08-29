import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import clsx from 'clsx'

const control =
  'interactive w-full rounded-input border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent disabled:opacity-60'

const controlBorder = (invalid?: boolean) => (invalid ? 'border-critical' : 'border-border')

interface FieldProps {
  label: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode
  hint?: string
  error?: string
  required?: boolean
  className?: string
}

/**
 * Label + control + hint/error, wired together.
 *
 * Takes its child as a render prop so the generated ids actually land on the
 * input: `aria-describedby` has to point at the hint *and* the error, and
 * `aria-invalid` has to be set when there's an error. Passing the control as
 * a plain child would mean every call site remembering to thread four
 * attributes, which in practice means most of them not doing it.
 */
export function Field({ label, children, hint, error, required, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-xs font-semibold text-text-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-critical" aria-hidden>
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-text-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

/** Legacy wrapper for the simple label-above-control case. */
export function FieldWrap({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(control, controlBorder(props['aria-invalid'] === true), className)}
        {...props}
      />
    )
  },
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={4}
        className={clsx(control, controlBorder(props['aria-invalid'] === true), 'resize-y', className)}
        {...props}
      />
    )
  },
)

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={clsx(control, controlBorder(props['aria-invalid'] === true), 'pr-8', className)}
        {...props}
      >
        {children}
      </select>
    )
  },
)

/**
 * A radio group styled as a segmented control.
 *
 * Radios rather than buttons: arrow keys move between options, the group
 * announces itself as a group, and the selected state is real rather than
 * inferred from a class. That matters here because this is the control the
 * whole Appearance screen is built from.
 */
export interface SegmentedOption<V extends string> {
  value: V
  label: string
  hint?: string
  swatchVar?: string
}

export function SegmentedControl<V extends string>({
  legend,
  description,
  options,
  value,
  onChange,
  columns = 'auto',
}: {
  legend: string
  description?: string
  options: readonly SegmentedOption<V>[]
  value: V
  onChange: (value: V) => void
  columns?: 'auto' | 'grid'
}) {
  const name = useId()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-bold uppercase tracking-wide text-text-faint">{legend}</legend>
      {description && <p className="-mt-1 text-xs text-text-muted">{description}</p>}

      <div
        className={clsx(
          'gap-2',
          columns === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3' : 'flex flex-wrap',
        )}
      >
        {options.map((option) => {
          const active = option.value === value
          return (
            <label
              key={option.value}
              className={clsx(
                'interactive flex cursor-pointer items-center gap-2 rounded-pill border px-3 py-1.5 text-left',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                active
                  ? 'border-accent bg-accent-bg text-text'
                  : 'border-border bg-surface-raised text-text-muted hover:border-border-strong',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.swatchVar && (
                <span
                  className="h-3.5 w-3.5 flex-none rounded-full border border-black/10"
                  style={{ background: `var(${option.swatchVar})` }}
                  aria-hidden
                />
              )}
              <span className="min-w-0">
                <span className="block text-xs font-semibold">{option.label}</span>
                {option.hint && (
                  <span className="block text-[10px] font-medium text-text-faint">{option.hint}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
