import { lazy, Suspense } from 'react'
import { useWebGLSupport } from '@/lib/hooks/useWebGLSupport'

// Lazy so `three` and r3f stay out of every chunk except this one.
const CarScene = lazy(() => import('@/components/three/CarScene'))

/**
 * Decorative 3D layer behind the signed-out screens. Purely ornamental, so it
 * is hidden from assistive tech, ignores the pointer, and renders nothing at
 * all on small screens or without WebGL — the page is complete without it.
 */
export function AuthBackdrop() {
  const supported = useWebGLSupport()
  if (!supported) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 hidden opacity-70 md:block">
      <Suspense fallback={null}>
        <CarScene />
      </Suspense>
    </div>
  )
}
