import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'

interface ScanRingProps {
  color: string
  animated: boolean
  position: [number, number, number]
}

/**
 * A ring that expands from the car and fades — a diagnostic "scan" pulse,
 * standing in for the inspection the product does.
 */
export function ScanRing({ color, animated, position }: ScanRingProps) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const t = useRef(0)

  useFrame((_, delta) => {
    if (!animated || !mesh.current || !material.current) return
    t.current = (t.current + delta * 0.35) % 1
    const k = t.current
    mesh.current.scale.setScalar(0.8 + k * 1.1)
    material.current.opacity = (1 - k) * 0.55
  })

  return (
    <mesh ref={mesh} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.9, 2, 64]} />
      <meshBasicMaterial ref={material} color={color} transparent opacity={animated ? 0.5 : 0.25} depthWrite={false} />
    </mesh>
  )
}
