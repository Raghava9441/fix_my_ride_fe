import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'

interface SceneCanvasProps {
  children: ReactNode
  /** Render continuously, or once and then only on demand (reduced motion). */
  animated: boolean
  className?: string
}

/**
 * Shared r3f canvas defaults for decorative scenes: transparent so the page
 * background shows through, capped pixel ratio so high-DPI screens don't
 * quadruple the fill cost, and no antialias-heavy extras.
 */
export function SceneCanvas({ children, animated, className }: SceneCanvasProps) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 1.5]}
      frameloop={animated ? 'always' : 'demand'}
      camera={{ position: [8, 3.4, 9], fov: 35 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
    >
      {children}
    </Canvas>
  )
}
