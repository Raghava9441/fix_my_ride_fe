import { Float } from '@react-three/drei'

interface FloatingPartsProps {
  color: string
  animated: boolean
}

/** Hex nut: a six-sided torus reads as a nut at this size. */
function Nut({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={scale}>
      <torusGeometry args={[0.28, 0.12, 6, 6]} />
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
    </mesh>
  )
}

function Bolt({ color, scale = 1 }: { color: string; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.16, 6]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 10]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

const PARTS: ReadonlyArray<{ kind: 'nut' | 'bolt'; position: [number, number, number]; scale: number; speed: number }> = [
  { kind: 'nut', position: [-1.5, 3.2, 3.5], scale: 1.1, speed: 1.2 },
  { kind: 'bolt', position: [1.2, 3.6, -1], scale: 1, speed: 1.6 },
  { kind: 'nut', position: [6.3, 2.6, -3.8], scale: 0.9, speed: 1.4 },
  { kind: 'bolt', position: [-6.2, 3.8, 0.5], scale: 1.2, speed: 1 },
  { kind: 'bolt', position: [5, 4.4, -0.2], scale: 0.8, speed: 1.8 },
]

/** Loose hardware drifting around the scene — the "garage bench" feel. */
export function FloatingParts({ color, animated }: FloatingPartsProps) {
  return (
    <>
      {PARTS.map((p, i) => (
        <Float
          key={i}
          position={p.position}
          speed={animated ? p.speed : 0}
          rotationIntensity={animated ? 1.4 : 0}
          floatIntensity={animated ? 1.1 : 0}
        >
          {p.kind === 'nut' ? <Nut color={color} scale={p.scale} /> : <Bolt color={color} scale={p.scale} />}
        </Float>
      ))}
    </>
  )
}
