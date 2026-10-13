import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Grid, Sparkles } from '@react-three/drei'
import { Vector3 } from 'three'
import type { Group } from 'three'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { SceneCanvas } from './SceneCanvas'
import { PlaceholderCar } from './PlaceholderCar'
import { Gear } from './Gear'
import { FloatingParts } from './FloatingParts'
import { ScanRing } from './ScanRing'

const CAR_POSITION: [number, number, number] = [3.2, 0, -1.5]
const BASE_CAMERA = new Vector3(8, 3.4, 9)

/**
 * Shared pointer state, normalised to -1..1. Listens on `window` because the
 * canvas sits behind the page content with pointer events off, so r3f's own
 * pointer state never fires.
 */
function usePointerTarget(enabled: boolean) {
  const target = useRef({ x: 0, y: 0 })
  useEffect(() => {
    if (!enabled) return
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])
  return target
}

/** Eases the camera a little toward the cursor for depth between layers. */
function CameraRig({ animated, pointer }: { animated: boolean; pointer: { current: { x: number; y: number } } }) {
  useFrame(({ camera }, delta) => {
    if (!animated) return
    const damp = 1 - Math.exp(-delta * 2.5)
    camera.position.x += (BASE_CAMERA.x + pointer.current.x * 0.9 - camera.position.x) * damp
    camera.position.y += (BASE_CAMERA.y - pointer.current.y * 0.5 - camera.position.y) * damp
    camera.lookAt(0, 1, 0)
  })
  return null
}

/** Turns the car slowly and leans it toward the cursor. */
function CarRig({
  animated,
  bodyColor,
  pointer,
}: {
  animated: boolean
  bodyColor: string
  pointer: { current: { x: number; y: number } }
}) {
  const group = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)

  // A static frame must be redrawn when its inputs change (reduced motion).
  useEffect(() => {
    invalidate()
  }, [animated, bodyColor, invalidate])

  useFrame((_, delta) => {
    const g = group.current
    if (!g || !animated) return
    g.rotation.y += delta * 0.25
    const damp = 1 - Math.exp(-delta * 3)
    g.rotation.x += (pointer.current.y * 0.12 - g.rotation.x) * damp
    g.rotation.z += (-pointer.current.x * 0.08 - g.rotation.z) * damp
  })

  return (
    <group ref={group} position={CAR_POSITION} rotation={[0, -0.6, 0]}>
      <PlaceholderCar bodyColor={bodyColor} animated={animated} />
    </group>
  )
}

/** Default export so the auth backdrop can `React.lazy` it. */
export default function CarScene() {
  const reduced = useReducedMotion()
  const { accent, muted } = useThemeColors()
  const animated = !reduced
  const pointer = usePointerTarget(animated)

  return (
    <SceneCanvas animated={animated}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 3]} intensity={1.6} castShadow />
      <pointLight position={[-4, 3, 4]} intensity={18} color={accent} />

      <CameraRig animated={animated} pointer={pointer} />

      {/* Garage floor: fading grid for depth. */}
      <Grid
        args={[40, 40]}
        position={[0, -0.01, 0]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor={muted}
        sectionSize={3}
        sectionThickness={1}
        sectionColor={accent}
        fadeDistance={24}
        fadeStrength={1.6}
        infiniteGrid
      />

      <CarRig animated={animated} bodyColor={accent} pointer={pointer} />
      <ScanRing color={accent} animated={animated} position={[CAR_POSITION[0], 0.02, CAR_POSITION[2]]} />
      <ContactShadows
        position={[CAR_POSITION[0], 0.01, CAR_POSITION[2]]}
        opacity={0.35}
        scale={9}
        blur={2.4}
        far={3}
        color={muted}
      />

      {/* Meshing gears, tilted to face the camera. */}
      <group position={[-4.3, 0.6, 3]} rotation={[0, 0.73, 0]} scale={0.75}>
        <Gear radius={1.6} teeth={16} color={accent} speed={0.35} animated={animated} />
        <Gear
          radius={0.9}
          teeth={9}
          color={muted}
          speed={-0.35 * (16 / 9)}
          animated={animated}
          phase={Math.PI / 9}
          position={[2.1, 1.2, 0]}
        />
      </group>

      <FloatingParts color={muted} animated={animated} />

      {animated && (
        <Sparkles count={70} scale={[16, 6, 12]} position={[0, 2.5, 0]} size={3} speed={0.4} opacity={0.7} color={accent} />
      )}
    </SceneCanvas>
  )
}
