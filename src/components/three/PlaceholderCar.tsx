import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

interface PlaceholderCarProps {
  bodyColor: string
  /** When false the car is posed statically (reduced motion). */
  animated: boolean
}

const WHEEL_POSITIONS: ReadonlyArray<readonly [number, number, number]> = [
  [-1.15, 0.38, 0.85],
  [1.15, 0.38, 0.85],
  [-1.15, 0.38, -0.85],
  [1.15, 0.38, -0.85],
]

/**
 * A low-poly stand-in built from primitives, so the 3D pipeline ships without
 * waiting on an art asset. Swap the body for a `useGLTF` model later; the
 * props and the scene around it stay the same.
 */
export function PlaceholderCar({ bodyColor, animated }: PlaceholderCarProps) {
  const wheels = useRef<Array<Group | null>>([])

  useFrame((_, delta) => {
    if (!animated) return
    for (const wheel of wheels.current) {
      if (wheel) wheel.rotation.z -= delta * 3
    }
  })

  return (
    <group>
      {/* Lower body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[3.4, 0.6, 1.6]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Cabin */}
      <mesh position={[-0.1, 1.2, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 1.4]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Glass band */}
      <mesh position={[-0.1, 1.22, 0]}>
        <boxGeometry args={[1.92, 0.34, 1.42]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.8} />
      </mesh>
      {/* Headlights */}
      {[-0.5, 0.5].map((z) => (
        <mesh key={z} position={[1.72, 0.75, z]}>
          <boxGeometry args={[0.06, 0.16, 0.32]} />
          <meshStandardMaterial color="#fef9c3" emissive="#fde68a" emissiveIntensity={1.2} />
        </mesh>
      ))}
      {/* Wheels */}
      {WHEEL_POSITIONS.map((position, i) => (
        <group
          key={i}
          position={position}
          ref={(node) => {
            wheels.current[i] = node
          }}
        >
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.38, 0.3, 20]} />
            <meshStandardMaterial color="#111827" roughness={0.8} />
          </mesh>
          {/* Hub, offset so the spin is visible */}
          <mesh position={[0.18, 0, position[2] > 0 ? 0.16 : -0.16]}>
            <boxGeometry args={[0.18, 0.06, 0.04]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
