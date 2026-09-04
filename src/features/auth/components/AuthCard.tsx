import type { ReactNode } from 'react'
import { Card, CardBody } from '@/components/ui'

/**
 * The shell every signed-out screen sits in.
 *
 * Exists so the six auth screens can't drift apart on width, padding, and
 * heading level — small differences that are invisible one screen at a time
 * and obvious when you move between them in a flow.
 *
 * `size` is the only variation. Onboarding collects organisation details and
 * genuinely needs the width; sign-in at that width looks like an error.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  size = 'sm',
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  /** Secondary links — "back to sign in", "create an account". */
  footer?: ReactNode
  size?: 'sm' | 'md'
}) {
  return (
    <Card className={size === 'md' ? 'w-full max-w-xl' : 'w-full max-w-sm'}>
      <CardBody className="flex flex-col gap-5 p-7">
        <div className="flex flex-col gap-1.5">
          {/*
            `h1` because these screens have no other heading and no app
            chrome above them — the AuthLayout's brand is a link, not a
            heading. A screen whose only heading is an h2 reads to a screen
            reader as a fragment of a page that isn't there.
          */}
          <h1 className="text-xl">{title}</h1>
          {description && <div className="text-sm text-text-muted">{description}</div>}
        </div>

        {children}

        {footer && <div className="flex items-center justify-between gap-3 text-xs">{footer}</div>}
      </CardBody>
    </Card>
  )
}
