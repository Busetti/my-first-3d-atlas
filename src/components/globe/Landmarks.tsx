import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { GLOBE_RADIUS } from './Earth'
import { lonLatToVector } from '../../lib/world'
import { lonLatToFlat, morph } from '../../lib/morph'
import { COUNTRY_BY_MAP_NAME } from '../../data/countries'
import { sfx, speak } from '../../lib/audio'
import { useAtlas } from '../../store'

interface LandmarkSpec {
  id: string
  name: string
  emoji: string
  country: string
  lon: number
  lat: number
  say: string
  build: () => ReactNode
}

const UP = new THREE.Vector3(0, 1, 0)

/** Screen bands owned by the header and the learning bar, in CSS pixels. */
const HEADER_SPACE = 96
const BOTTOM_SPACE = 160

/** How far the name pill floats above the planet's surface, in world units. */
const LABEL_HEIGHT = 0.62

export function Landmarks() {
  return (
    <group>
      {LANDMARKS.map((spec) => (
        <Landmark key={spec.id} spec={spec} />
      ))}
    </group>
  )
}

function Landmark({ spec }: { spec: LandmarkSpec }) {
  const select = useAtlas((s) => s.select)
  const group = useRef<THREE.Group>(null)
  const model = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const bounce = useRef(-10)
  const hovering = useRef(false)

  const shape = useMemo(() => {
    const dir = new THREE.Vector3(...lonLatToVector(spec.lon, spec.lat))
    const flat = new THREE.Vector3(...lonLatToFlat(spec.lon, spec.lat))
    return {
      round: dir.clone().multiplyScalar(GLOBE_RADIUS * 0.995),
      flat,
      roundTurn: new THREE.Quaternion().setFromUnitVectors(UP, dir),
      flatTurn: new THREE.Quaternion(),
      // Where the name pill actually hangs. Near the edge of the disc the
      // surface normal points sideways on screen, so this can be a long way
      // from the model's base — and it is the pill we need to keep in frame.
      roundLabel: dir.clone().multiplyScalar(GLOBE_RADIUS * 0.995 + LABEL_HEIGHT),
      flatLabel: flat.clone().add(new THREE.Vector3(0, LABEL_HEIGHT, 0)),
    }
  }, [spec.lon, spec.lat])

  const scratch = useMemo(() => new THREE.Vector3(), [])
  const anchor = useMemo(() => new THREE.Vector3(), [])
  const facingFrom = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const m = morph.value

    // Ride the same flattening the planet is doing.
    if (group.current) {
      group.current.position.lerpVectors(shape.round, shape.flat, m)
      group.current.quaternion.slerpQuaternions(shape.roundTurn, shape.flatTurn, m)
    }

    if (model.current) {
      // Always breathing a little, plus a springy squash when tapped.
      const idle = 1 + Math.sin(t * 1.7 + spec.lon) * 0.035
      const since = t - bounce.current
      const kick = since < 1.1 ? Math.sin(since * 16) * Math.exp(-since * 4) : 0
      const hover = hovering.current ? 1.16 : 1
      model.current.scale.set(hover * idle * (1 - kick * 0.28), hover * idle * (1 + kick * 0.55), hover * idle * (1 - kick * 0.28))
      model.current.position.y = Math.abs(kick) * 0.12
    }

    // Hide the label once the landmark rotates around the back of the planet,
    // or drifts somewhere the pill would be clipped: off an edge, under the
    // header, or behind the bottom bar. The pill's real width drives this, so
    // it holds for any name at any screen size.
    if (label.current) {
      // A flat map has no far side, so nothing is ever turned away from us.
      facingFrom.copy(shape.round).normalize()
      const behind = facingFrom.dot(scratch.copy(state.camera.position).normalize())
      const facing = m > 0.5 ? 1 : behind

      anchor.lerpVectors(shape.roundLabel, shape.flatLabel, m)
      const ndc = scratch.copy(anchor).project(state.camera)
      const x = (ndc.x * 0.5 + 0.5) * state.size.width
      const y = (-ndc.y * 0.5 + 0.5) * state.size.height
      const halfPill = label.current.offsetWidth / 2 + 8

      const visible =
        facing > 0.3 &&
        x - halfPill > 6 &&
        x + halfPill < state.size.width - 6 &&
        y > HEADER_SPACE &&
        y < state.size.height - BOTTOM_SPACE

      label.current.style.opacity = visible ? '1' : '0'
      label.current.style.pointerEvents = visible ? 'auto' : 'none'
      label.current.style.transform = `scale(${visible ? 1 : 0.7})`
    }
  })

  const activate = () => {
    bounce.current = performance.now() / 1000
    sfx('pop')
    const country = COUNTRY_BY_MAP_NAME.get(spec.country)
    if (country) select(country, { fly: true })
    speak(spec.say)
  }

  return (
    <group ref={group} position={shape.round} quaternion={shape.roundTurn}>
      <group
        ref={model}
        onPointerOver={(e) => {
          e.stopPropagation()
          hovering.current = true
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          hovering.current = false
          document.body.style.cursor = ''
        }}
        onClick={(e) => {
          e.stopPropagation()
          activate()
        }}
      >
        {/* Invisible chunky hit box — small fingers should not have to be precise. */}
        <mesh position={[0, 0.16, 0]} visible={false}>
          <boxGeometry args={[0.3, 0.42, 0.3]} />
        </mesh>

        {/* A thin glowing ring says "tap me" without becoming a blob of colour
            that swallows the model at small sizes. */}
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.082, 0.104, 40]} />
          <meshBasicMaterial
            color="#fff0b0"
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>

        <group scale={1.15}>{spec.build()}</group>
      </group>

      {/* A small, constant-size name tag. It floats well clear of the model so
          it labels the landmark instead of covering it, and it does not swell
          when the child zooms in. */}
      <Html center position={[0, LABEL_HEIGHT, 0]} zIndexRange={[20, 10]}>
        <div
          ref={label}
          onClick={activate}
          className="glass-soft squish flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-none font-extrabold whitespace-nowrap text-white transition-opacity duration-300"
          style={{ opacity: 0 }}
        >
          <span className="text-[13px]">{spec.emoji}</span>
          {spec.name}
        </div>
      </Html>
    </group>
  )
}

// ── The four cartoon models ───────────────────────────────────────────────
// Everything is built from boxes, cones and spheres so there is nothing to
// download and it all keeps the same chunky toy look.

const IRON = '#eaa94f'
const IRON_DARK = '#c07f2a'
const MARBLE = '#fff8ec'
const SAND = '#f2c76b'
const COPPER = '#79d6b4'

function Eiffel() {
  // At the size this actually renders, only the silhouette survives: a wide
  // splayed base narrowing to a needle. Three frustums do that job; extra
  // detail would only turn into mush.
  return (
    <group>
      <mesh position={[0, 0.07, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.035, 0.075, 0.14, 4]} />
        <meshStandardMaterial color={IRON} flatShading roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.145, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.075, 0.012, 0.075]} />
        <meshStandardMaterial color={IRON_DARK} flatShading />
      </mesh>
      <mesh position={[0, 0.215, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.016, 0.032, 0.13, 4]} />
        <meshStandardMaterial color={IRON} flatShading roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.286, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.038, 0.01, 0.038]} />
        <meshStandardMaterial color={IRON_DARK} flatShading />
      </mesh>
      <mesh position={[0, 0.345, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.004, 0.014, 0.11, 4]} />
        <meshStandardMaterial color={IRON} flatShading roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.412, 0]}>
        <sphereGeometry args={[0.014, 12, 12]} />
        <meshStandardMaterial color="#ffd647" emissive="#ffb300" emissiveIntensity={1.1} />
      </mesh>
    </group>
  )
}

function TajMahal() {
  const minaret = (x: number, z: number) => (
    <group position={[x, 0, z]} key={`${x}-${z}`}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.014, 0.018, 0.24, 8]} />
        <meshStandardMaterial color={MARBLE} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.252, 0]}>
        <sphereGeometry args={[0.024, 10, 10]} />
        <meshStandardMaterial color={MARBLE} roughness={0.6} />
      </mesh>
    </group>
  )
  return (
    <group>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.26, 0.04, 0.26]} />
        <meshStandardMaterial color="#ffe9c9" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[0.15, 0.1, 0.15]} />
        <meshStandardMaterial color={MARBLE} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.175, 0]} scale={[1, 1.15, 1]}>
        <sphereGeometry args={[0.072, 20, 16]} />
        <meshStandardMaterial color={MARBLE} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.265, 0]}>
        <coneGeometry args={[0.012, 0.05, 8]} />
        <meshStandardMaterial color="#ffd647" emissive="#ffb300" emissiveIntensity={0.4} />
      </mesh>
      {[
        [0.105, 0.105],
        [-0.105, 0.105],
        [0.105, -0.105],
        [-0.105, -0.105],
      ].map(([x, z]) => minaret(x, z))}
    </group>
  )
}

function Liberty() {
  return (
    <group>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.11, 0.08, 0.11]} />
        <meshStandardMaterial color="#c9b79c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.032, 0.045, 0.03, 8]} />
        <meshStandardMaterial color="#a89680" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.185, 0]}>
        <coneGeometry args={[0.048, 0.17, 10]} />
        <meshStandardMaterial color={COPPER} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.288, 0]}>
        <sphereGeometry args={[0.028, 14, 14]} />
        <meshStandardMaterial color={COPPER} roughness={0.6} />
      </mesh>
      {/* Crown spikes */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.028, 0.308, Math.sin(a) * 0.028]}
            rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}
          >
            <coneGeometry args={[0.007, 0.032, 5]} />
            <meshStandardMaterial color={COPPER} />
          </mesh>
        )
      })}
      {/* Torch arm */}
      <mesh position={[0.055, 0.29, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.009, 0.009, 0.14, 6]} />
        <meshStandardMaterial color={COPPER} roughness={0.6} />
      </mesh>
      <mesh position={[0.085, 0.36, 0]}>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshStandardMaterial color="#ffd647" emissive="#ff9c00" emissiveIntensity={1.4} />
      </mesh>
      <pointLight position={[0.085, 0.36, 0]} color="#ffb648" intensity={0.35} distance={0.8} />
    </group>
  )
}

function Pyramids() {
  const one = (x: number, z: number, s: number) => (
    <mesh key={`${x}-${z}`} position={[x, (0.16 * s) / 2, z]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.11 * s, 0.16 * s, 4]} />
      <meshStandardMaterial color={SAND} flatShading roughness={0.85} />
    </mesh>
  )
  return (
    <group>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 24]} />
        <meshStandardMaterial color="#e8bd72" roughness={1} />
      </mesh>
      {one(0, 0, 1.25)}
      {one(-0.115, 0.075, 0.8)}
      {one(0.11, 0.085, 0.6)}
      {/* Sphinx-ish little block, just enough to hint at it. */}
      <mesh position={[0.02, 0.022, -0.13]}>
        <boxGeometry args={[0.07, 0.036, 0.03]} />
        <meshStandardMaterial color="#e3b263" flatShading />
      </mesh>
    </group>
  )
}

const LANDMARKS: LandmarkSpec[] = [
  {
    id: 'eiffel',
    name: 'Eiffel Tower',
    emoji: '🗼',
    country: 'France',
    lon: 2.29,
    lat: 48.86,
    say: 'The Eiffel Tower in Paris, France. It is made of iron and it sparkles at night!',
    build: Eiffel,
  },
  {
    id: 'taj',
    name: 'Taj Mahal',
    emoji: '🕌',
    country: 'India',
    lon: 78.04,
    lat: 27.17,
    say: 'The Taj Mahal in India. It is made of shiny white marble!',
    build: TajMahal,
  },
  {
    id: 'liberty',
    name: 'Statue of Liberty',
    emoji: '🗽',
    country: 'United States of America',
    lon: -74.04,
    lat: 40.69,
    say: 'The Statue of Liberty in New York. She holds a golden torch up high!',
    build: Liberty,
  },
  {
    id: 'pyramids',
    name: 'Pyramids of Giza',
    emoji: '🏜️',
    country: 'Egypt',
    lon: 31.13,
    lat: 29.98,
    say: 'The Pyramids in Egypt. They are older than four thousand years!',
    build: Pyramids,
  },
]
