import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ExtrudeGeometry, Path, Shape } from 'three'
import type { Mesh } from 'three'

interface GearProps {
  radius: number
  teeth: number
  color: string
  /** Radians per second; sign sets direction. */
  speed: number
  animated: boolean
  /** Rotate by half a tooth so two gears can interlock. */
  phase?: number
  position?: [number, number, number]
}

function buildGearGeometry(radius: number, teeth: number): ExtrudeGeometry {
  const toothDepth = radius * 0.16
  const inner = radius - toothDepth
  const shape = new Shape()
  const step = (Math.PI * 2) / teeth

  for (let i = 0; i < teeth; i++) {
    const a = i * step
    // Root, rising flank, tip, falling flank — a trapezoidal tooth.
    const pts: Array<[number, number]> = [
      [inner, a],
      [radius, a + step * 0.2],
      [radius, a + step * 0.45],
      [inner, a + step * 0.65],
    ]
    pts.forEach(([r, ang], j) => {
      const x = Math.cos(ang) * r
      const y = Math.sin(ang) * r
      if (i === 0 && j === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    })
  }
  shape.closePath()

  const hole = new Path()
  hole.absarc(0, 0, inner * 0.35, 0, Math.PI * 2, true)
  shape.holes.push(hole)

  return new ExtrudeGeometry(shape, { depth: radius * 0.22, bevelEnabled: false })
}

/** A flat extruded gear that turns about its own axis (z). */
export function Gear({ radius, teeth, color, speed, animated, phase = 0, position }: GearProps) {
  const mesh = useRef<Mesh>(null)
  const geometry = useMemo(() => buildGearGeometry(radius, teeth), [radius, teeth])

  useFrame((_, delta) => {
    if (animated && mesh.current) mesh.current.rotation.z += delta * speed
  })

  return (
    <mesh ref={mesh} geometry={geometry} position={position} rotation={[0, 0, phase]} castShadow>
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.35} />
    </mesh>
  )
}
