import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'

const controlClass =
  'w-full rounded-input border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent'

interface FieldWrapProps {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}

export function FieldWrap({ label, htmlFor, children, className }: FieldWrapProps) {
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
    return <input ref={ref} className={clsx(controlClass, className)} {...props} />
  },
)

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={clsx(controlClass, className)} {...props}>
        {children}
      </select>
    )
  },
)
