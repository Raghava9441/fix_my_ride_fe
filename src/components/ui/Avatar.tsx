import clsx from 'clsx'

/**
 * Initials avatar with a deterministic colour.
 *
 * The hue comes from a hash of the identity string, so the same person is
 * the same colour on every screen and across sessions — that consistency is
 * what makes an avatar scannable in a list. Fixed saturation/lightness keeps
 * every generated colour legible against white text in both themes.
 */
function hueFor(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360
  return hash
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const sizes = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: keyof typeof sizes
  className?: string
}) {
  const hue = hueFor(name)

  return (
    <span
      className={clsx(
        'inline-flex flex-none items-center justify-center rounded-full font-bold text-white select-none',
        sizes[size],
        className,
      )}
      style={{ background: `hsl(${hue} 42% 38%)` }}
      title={name}
    >
      {initialsFor(name)}
    </span>
  )
}
