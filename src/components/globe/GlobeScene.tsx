import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sparkles, Stars } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { Earth, GLOBE_RADIUS } from './Earth'
import { Landmarks } from './Landmarks'
import { Flight } from './Flight'
import { lonLatToVector } from '../../lib/world'
import { FLAT_H, FLAT_W, lonLatToFlat, morph } from '../../lib/morph'
import { useAtlas } from '../../store'
import { sfx } from '../../lib/audio'

const FOV = 40

/**
 * How far back the camera has to sit for the whole planet to fit on screen.
 * A tall phone is limited by its width, a laptop by its height, so the fit is
 * measured against whichever field of view is tighter.
 */
function fitDistance(aspect: number, padding: number): number {
  const vertical = (FOV * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  return (GLOBE_RADIUS * padding) / Math.sin(Math.min(vertical, horizontal) / 2)
}

/** The same idea for the unrolled chart, which is a wide rectangle, not a ball. */
function fitFlat(aspect: number, padding: number): number {
  const vertical = (FOV * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  const byWidth = (FLAT_W / 2) * padding / Math.tan(horizontal / 2)
  const byHeight = (FLAT_H / 2) * padding / Math.tan(vertical / 2)
  return Math.max(byWidth, byHeight)
}

export function GlobeScene({ onReady }: { onReady: () => void }) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [-1.4, 1.5, 6.9], fov: FOV, near: 0.1, far: 200 }}
      // Transparent so the CSS aurora backdrop shows through behind the stars.
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      onCreated={({ gl }) => {
        // No filmic curve: the painted countries should stay poster-bright.
        gl.toneMapping = THREE.NoToneMapping
      }}
    >
      <Scene onReady={onReady} />
    </Canvas>
  )
}

function Scene({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const controls = useRef<OrbitControlsImpl>(null)
  const selected = useAtlas((s) => s.selected)
  const view = useAtlas((s) => s.view)

  const aspect = size.width / size.height
  const narrow = size.width < 1024

  // Leave a little more room on a big screen, where the info card sits beside
  // the globe; on a phone it should use nearly the full width.
  const globeFit = useMemo(() => fitDistance(aspect, narrow ? 1.08 : 1.34), [aspect, narrow])
  const flatFit = useMemo(() => fitFlat(aspect, narrow ? 1.06 : 1.24), [aspect, narrow])
  const fit = view === 'flat' ? flatFit : globeFit

  // Re-frame on resize, and when unrolling swing round to face the map head-on.
  useEffect(() => {
    if (view === 'flat') {
      camera.position.set(0, 0, flatFit)
    } else {
      camera.position.setLength(globeFit)
    }
    controls.current?.target.set(0, 0, 0)
    camera.lookAt(0, 0, 0)
    controls.current?.update()
  }, [camera, view, globeFit, flatFit])

  useEffect(() => {
    const id = requestAnimationFrame(onReady)
    return () => cancelAnimationFrame(id)
  }, [onReady])

  return (
    <>
      {/* three.js divides diffuse irradiance by PI, so an intensity of ~3.1
          is what actually lands as full brightness. Ambient alone lights the
          night half — dusky, never black, because this is a toy. */}
      <ambientLight intensity={1.9} color="#cfd8ff" />
      <hemisphereLight intensity={0.35} color="#dceaff" groundColor="#4b3a9a" />
      <Sun />

      <Earth maxAnisotropy={gl.capabilities.getMaxAnisotropy()} />
      <Landmarks />
      <Flight />

      <Sparkles count={150} scale={[18, 12, 18]} size={5} speed={0.22} opacity={0.6} color="#fff2b6" />
      <Sparkles count={70} scale={[12, 9, 12]} size={9} speed={0.12} opacity={0.35} color="#9ad8ff" />
      <Stars radius={70} depth={40} count={1400} factor={3.4} saturation={0} fade speed={0.5} />

      <OrbitControls
        ref={controls}
        // A flat chart is dragged around like a paper map; a globe is spun.
        enablePan={view === 'flat'}
        enableRotate={view === 'globe'}
        screenSpacePanning
        enableDamping
        dampingFactor={0.075}
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        minDistance={Math.max(GLOBE_RADIUS + 0.9, fit * 0.42)}
        maxDistance={fit * 1.7}
        autoRotate={view === 'globe' && !selected}
        autoRotateSpeed={0.32}
      />
      <CameraRig controls={controls} distance={fit} />
    </>
  )
}

/** A visible sun that slowly circles the planet, which is what makes day and night. */
function Sun() {
  const light = useRef<THREE.DirectionalLight>(null)
  const ball = useRef<THREE.Group>(null)

  useFrame((state) => {
    // Starts just behind the camera's shoulder so the first view is sunlit.
    const a = state.clock.elapsedTime * 0.03 + 1.35
    const orbitX = Math.cos(a) * 22
    const orbitZ = Math.sin(a) * 22
    ball.current?.position.set(orbitX, 6, orbitZ)
    ball.current?.scale.setScalar(1 - morph.value)

    // A flat chart has no day and night — every part of it should be readable —
    // so as the map unrolls the sun slides round to light it from the front.
    const m = morph.value
    light.current?.position.set(
      THREE.MathUtils.lerp(orbitX, 3, m),
      THREE.MathUtils.lerp(6, 5, m),
      THREE.MathUtils.lerp(orbitZ, 24, m),
    )
  })

  return (
    <>
      {/* Warm sun against cool ambient: the terminator reads as a colour shift
          from golden day to blue evening, not as a dark, gloomy patch. */}
      <directionalLight ref={light} intensity={1.45} color="#fff0c4" />
      <group ref={ball}>
        <mesh>
          <sphereGeometry args={[0.8, 24, 24]} />
          <meshBasicMaterial color="#fff6cf" />
        </mesh>
        <mesh scale={3}>
          <sphereGeometry args={[0.8, 24, 24]} />
          <meshBasicMaterial color="#ffcf5c" transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

/**
 * Swings the view round to whatever the child just picked. On the globe the
 * move follows the surface of an invisible sphere, so it never dives through
 * the planet; on the flat chart it simply slides the map along.
 */
function CameraRig({ controls, distance }: { controls: RefObject<OrbitControlsImpl | null>; distance: number }) {
  const flyTo = useAtlas((s) => s.flyTo)
  const clearFlyTo = useAtlas((s) => s.clearFlyTo)
  const view = useAtlas((s) => s.view)
  const { width, height } = useThree((s) => s.size)
  const orbitGoal = useRef<THREE.Spherical | null>(null)
  const panGoal = useRef<THREE.Vector3 | null>(null)
  const spherical = useRef(new THREE.Spherical())

  useEffect(() => {
    if (!flyTo) return
    // Offset the view so the country lands clear of the info card: above it on
    // a narrow phone layout, beside it on a wide one where the card is a column
    // down the right.
    const narrow = width < 1024

    if (view === 'flat') {
      const [x, y] = lonLatToFlat(flyTo.lon, flyTo.lat)
      // Zoom in as well — at the whole-map distance a country is a smudge.
      const zoom = distance * 0.62 * flyTo.zoom
      const visibleH = 2 * zoom * Math.tan(((FOV * Math.PI) / 180) / 2)
      const visibleW = visibleH * (width / height)
      // Aiming the camera *past* the country is what pushes the country itself
      // the other way on screen: right of the target to sit left of the card,
      // below the target to sit above it.
      panGoal.current = new THREE.Vector3(
        x + (narrow ? 0 : visibleW * 0.16),
        y - (narrow ? visibleH * 0.26 : 0),
        zoom,
      )
      orbitGoal.current = null
    } else {
      const dir = new THREE.Vector3(...lonLatToVector(flyTo.lon, flyTo.lat))
      const dest = new THREE.Spherical().setFromVector3(dir.multiplyScalar(distance * 0.88 * flyTo.zoom))
      dest.phi = THREE.MathUtils.clamp(dest.phi + (narrow ? 0.58 : 0.16), 0.3, Math.PI - 0.3)
      orbitGoal.current = dest
      panGoal.current = null
    }

    sfx('whoosh')
    clearFlyTo()
  }, [flyTo, clearFlyTo, width, height, distance, view])

  useFrame((state, delta) => {
    const cam = state.camera
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.05))

    const pan = panGoal.current
    if (pan) {
      const target = controls.current?.target
      if (!target) return
      const dx = pan.x - target.x
      const dy = pan.y - target.y
      const dz = pan.z - cam.position.z
      target.x += dx * k
      target.y += dy * k
      cam.position.x += dx * k
      cam.position.y += dy * k
      cam.position.z += dz * k
      controls.current?.update()
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(dz) < 0.02) panGoal.current = null
      return
    }

    const dest = orbitGoal.current
    if (!dest) return

    const now = spherical.current.setFromVector3(cam.position)
    let dTheta = dest.theta - now.theta
    while (dTheta > Math.PI) dTheta -= Math.PI * 2
    while (dTheta < -Math.PI) dTheta += Math.PI * 2

    now.theta += dTheta * k
    now.phi += (dest.phi - now.phi) * k
    now.radius += (dest.radius - now.radius) * k
    cam.position.setFromSpherical(now)
    cam.lookAt(0, 0, 0)
    controls.current?.update()

    if (Math.abs(dTheta) < 0.004 && Math.abs(dest.phi - now.phi) < 0.004 && Math.abs(dest.radius - now.radius) < 0.02) {
      orbitGoal.current = null
    }
  })

  return null
}
