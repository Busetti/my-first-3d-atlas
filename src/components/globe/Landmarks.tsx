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

/**
 * Screen rectangles already claimed by a name tag this frame. Thirteen
 * landmarks packed into Europe and Asia would otherwise stack their labels into
 * an unreadable pile, so each one checks the boxes taken before it and stays
 * hidden if it would overlap. Earlier entries in LANDMARKS win, which is why
 * the most famous few are listed first.
 */
const claimed: { x1: number; y1: number; x2: number; y2: number }[] = []

export function Landmarks() {
  return (
    <group>
      {LANDMARKS.map((spec, index) => (
        <Landmark key={spec.id} spec={spec} index={index} />
      ))}
    </group>
  )
}

function Landmark({ spec, index }: { spec: LandmarkSpec; index: number }) {
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

    // The first landmark of the frame opens a fresh sheet of claimed labels.
    if (index === 0) claimed.length = 0

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
      const halfTall = label.current.offsetHeight / 2 + 4

      const onScreen =
        facing > 0.3 &&
        x - halfPill > 6 &&
        x + halfPill < state.size.width - 6 &&
        y > HEADER_SPACE &&
        y < state.size.height - BOTTOM_SPACE

      // Give way to any tag already placed this frame.
      const box = { x1: x - halfPill, y1: y - halfTall, x2: x + halfPill, y2: y + halfTall }
      const clash =
        onScreen &&
        claimed.some((c) => box.x1 < c.x2 && box.x2 > c.x1 && box.y1 < c.y2 && box.y2 > c.y1)

      const visible = onScreen && !clash
      if (visible) claimed.push(box)

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
// ── The cartoon models ────────────────────────────────────────────────────
// Everything is built from boxes, cones and spheres so there is nothing to
// download and it all keeps the same chunky toy look. At the size these render,
// only the silhouette survives — so each one spends its polygons on the shape a
// child would recognise from a picture book, and nothing else.
//
// Materials are shared across every landmark rather than declared inline, which
// keeps twelve models down to a handful of shaders.

const stone = new THREE.MeshStandardMaterial({ color: '#d8cbb4', roughness: 0.9, flatShading: true })
const darkStone = new THREE.MeshStandardMaterial({ color: '#b3a48c', roughness: 0.9, flatShading: true })
const marble = new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.5 })
const iron = new THREE.MeshStandardMaterial({ color: '#eaa94f', roughness: 0.55, flatShading: true })
const ironDark = new THREE.MeshStandardMaterial({ color: '#c07f2a', roughness: 0.6, flatShading: true })
const copper = new THREE.MeshStandardMaterial({ color: '#79d6b4', roughness: 0.6 })
const sand = new THREE.MeshStandardMaterial({ color: '#f2c76b', roughness: 0.85, flatShading: true })
const sandDark = new THREE.MeshStandardMaterial({ color: '#e3b263', roughness: 0.9, flatShading: true })
const snow = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 })
const rock = new THREE.MeshStandardMaterial({ color: '#8d7f96', roughness: 0.95, flatShading: true })
const forest = new THREE.MeshStandardMaterial({ color: '#5fbf72', roughness: 0.9, flatShading: true })
const brick = new THREE.MeshStandardMaterial({ color: '#cf9a6a', roughness: 0.9, flatShading: true })
const gold = new THREE.MeshStandardMaterial({
  color: '#ffd647',
  emissive: '#ffb300',
  emissiveIntensity: 0.9,
  roughness: 0.4,
})

function Eiffel() {
  return (
    <group>
      <mesh position={[0, 0.07, 0]} rotation={[0, Math.PI / 4, 0]} material={iron}>
        <cylinderGeometry args={[0.035, 0.075, 0.14, 4]} />
      </mesh>
      <mesh position={[0, 0.145, 0]} rotation={[0, Math.PI / 4, 0]} material={ironDark}>
        <boxGeometry args={[0.075, 0.012, 0.075]} />
      </mesh>
      <mesh position={[0, 0.215, 0]} rotation={[0, Math.PI / 4, 0]} material={iron}>
        <cylinderGeometry args={[0.016, 0.032, 0.13, 4]} />
      </mesh>
      <mesh position={[0, 0.286, 0]} rotation={[0, Math.PI / 4, 0]} material={ironDark}>
        <boxGeometry args={[0.038, 0.01, 0.038]} />
      </mesh>
      <mesh position={[0, 0.345, 0]} rotation={[0, Math.PI / 4, 0]} material={iron}>
        <cylinderGeometry args={[0.004, 0.014, 0.11, 4]} />
      </mesh>
      <mesh position={[0, 0.412, 0]} material={gold}>
        <sphereGeometry args={[0.014, 12, 12]} />
      </mesh>
    </group>
  )
}

function TajMahal() {
  const minaret = (x: number, z: number) => (
    <group position={[x, 0, z]} key={`${x}-${z}`}>
      <mesh position={[0, 0.12, 0]} material={marble}>
        <cylinderGeometry args={[0.014, 0.018, 0.24, 8]} />
      </mesh>
      <mesh position={[0, 0.252, 0]} material={marble}>
        <sphereGeometry args={[0.024, 10, 10]} />
      </mesh>
    </group>
  )
  return (
    <group>
      <mesh position={[0, 0.02, 0]} material={stone}>
        <boxGeometry args={[0.26, 0.04, 0.26]} />
      </mesh>
      <mesh position={[0, 0.09, 0]} material={marble}>
        <boxGeometry args={[0.15, 0.1, 0.15]} />
      </mesh>
      <mesh position={[0, 0.175, 0]} scale={[1, 1.15, 1]} material={marble}>
        <sphereGeometry args={[0.072, 20, 16]} />
      </mesh>
      <mesh position={[0, 0.265, 0]} material={gold}>
        <coneGeometry args={[0.012, 0.05, 8]} />
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
      <mesh position={[0, 0.04, 0]} material={stone}>
        <boxGeometry args={[0.11, 0.08, 0.11]} />
      </mesh>
      <mesh position={[0, 0.09, 0]} material={darkStone}>
        <cylinderGeometry args={[0.032, 0.045, 0.03, 8]} />
      </mesh>
      <mesh position={[0, 0.185, 0]} material={copper}>
        <coneGeometry args={[0.048, 0.17, 10]} />
      </mesh>
      <mesh position={[0, 0.288, 0]} material={copper}>
        <sphereGeometry args={[0.028, 14, 14]} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.028, 0.308, Math.sin(a) * 0.028]}
            rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}
            material={copper}
          >
            <coneGeometry args={[0.007, 0.032, 5]} />
          </mesh>
        )
      })}
      <mesh position={[0.055, 0.29, 0]} rotation={[0, 0, -0.5]} material={copper}>
        <cylinderGeometry args={[0.009, 0.009, 0.14, 6]} />
      </mesh>
      <mesh position={[0.085, 0.36, 0]} material={gold}>
        <sphereGeometry args={[0.024, 12, 12]} />
      </mesh>
    </group>
  )
}

function Pyramids() {
  const one = (x: number, z: number, s: number) => (
    <mesh key={`${x}-${z}`} position={[x, (0.16 * s) / 2, z]} rotation={[0, Math.PI / 4, 0]} material={sand}>
      <coneGeometry args={[0.11 * s, 0.16 * s, 4]} />
    </mesh>
  )
  return (
    <group>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sandDark}>
        <circleGeometry args={[0.2, 24]} />
      </mesh>
      {one(0, 0, 1.25)}
      {one(-0.115, 0.075, 0.8)}
      {one(0.11, 0.085, 0.6)}
      <mesh position={[0.02, 0.022, -0.13]} material={sandDark}>
        <boxGeometry args={[0.07, 0.036, 0.03]} />
      </mesh>
    </group>
  )
}

/** A run of wall snaking over hills, with a watchtower at each end. */
function GreatWall() {
  const segments = 7
  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => {
        const t = i / (segments - 1) - 0.5
        const x = t * 0.34
        const lift = Math.cos(t * Math.PI * 2) * 0.018
        return (
          <mesh key={i} position={[x, 0.03 + lift, Math.sin(t * Math.PI * 1.6) * 0.05]} material={brick}>
            <boxGeometry args={[0.055, 0.06, 0.038]} />
          </mesh>
        )
      })}
      <mesh position={[-0.17, 0.055, -0.045]} material={brick}>
        <boxGeometry args={[0.055, 0.11, 0.055]} />
      </mesh>
      <mesh position={[0.17, 0.055, -0.045]} material={brick}>
        <boxGeometry args={[0.055, 0.11, 0.055]} />
      </mesh>
      <mesh position={[-0.17, 0.118, -0.045]} material={darkStone}>
        <boxGeometry args={[0.065, 0.016, 0.065]} />
      </mesh>
      <mesh position={[0.17, 0.118, -0.045]} material={darkStone}>
        <boxGeometry args={[0.065, 0.016, 0.065]} />
      </mesh>
    </group>
  )
}

/** Three overlapping sails, the one shape everyone draws for Sydney. */
function OperaHouse() {
  const shell = (x: number, z: number, s: number, turn: number) => (
    <mesh
      key={`${x}-${z}`}
      position={[x, 0.02, z]}
      rotation={[0.42, turn, 0]}
      scale={[s, s * 1.35, s * 0.55]}
      material={marble}
    >
      <sphereGeometry args={[0.09, 18, 14, 0, Math.PI, 0, Math.PI / 2]} />
    </mesh>
  )
  return (
    <group>
      <mesh position={[0, 0.012, 0]} material={darkStone}>
        <boxGeometry args={[0.3, 0.024, 0.17]} />
      </mesh>
      {shell(-0.07, 0.01, 1, -0.35)}
      {shell(0.02, -0.01, 0.82, 0.1)}
      {shell(0.1, 0.015, 0.62, 0.5)}
    </group>
  )
}

/** A figure with arms straight out — unmistakable even at a few pixels. */
function Redeemer() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} material={rock}>
        <coneGeometry args={[0.11, 0.06, 6]} />
      </mesh>
      <mesh position={[0, 0.085, 0]} material={stone}>
        <boxGeometry args={[0.055, 0.05, 0.055]} />
      </mesh>
      <mesh position={[0, 0.185, 0]} material={stone}>
        <cylinderGeometry args={[0.019, 0.03, 0.15, 8]} />
      </mesh>
      {/* The arms are the whole point of the silhouette. */}
      <mesh position={[0, 0.232, 0]} material={stone}>
        <boxGeometry args={[0.19, 0.017, 0.019]} />
      </mesh>
      <mesh position={[0, 0.278, 0]} material={stone}>
        <sphereGeometry args={[0.021, 12, 12]} />
      </mesh>
    </group>
  )
}

/** An open ring of arches. */
function Colosseum() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} material={stone}>
        <cylinderGeometry args={[0.1, 0.108, 0.12, 20, 1, true]} />
      </mesh>
      <mesh position={[0, 0.06, 0]} material={darkStone}>
        <cylinderGeometry args={[0.082, 0.088, 0.115, 20, 1, true]} />
      </mesh>
      <mesh position={[0, 0.122, 0]} rotation={[-Math.PI / 2, 0, 0]} material={stone}>
        <ringGeometry args={[0.082, 0.106, 20]} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sandDark}>
        <circleGeometry args={[0.108, 20]} />
      </mesh>
    </group>
  )
}

/** A tall clock tower with a pointed roof. */
function BigBen() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} material={stone}>
        <boxGeometry args={[0.062, 0.28, 0.062]} />
      </mesh>
      {/* Clock faces on all four sides, so it reads from any angle. */}
      {[
        [0, 0.0325],
        [0.0325, 0],
        [0, -0.0325],
        [-0.0325, 0],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.245, z]} rotation={[Math.PI / 2, 0, 0]} material={marble}>
          <cylinderGeometry args={[0.021, 0.021, 0.004, 14]} />
        </mesh>
      ))}
      <mesh position={[0, 0.292, 0]} material={darkStone}>
        <boxGeometry args={[0.072, 0.014, 0.072]} />
      </mesh>
      <mesh position={[0, 0.335, 0]} rotation={[0, Math.PI / 4, 0]} material={copper}>
        <coneGeometry args={[0.05, 0.075, 4]} />
      </mesh>
      <mesh position={[0, 0.382, 0]} material={gold}>
        <sphereGeometry args={[0.012, 10, 10]} />
      </mesh>
    </group>
  )
}

/** A wide cone with a snow cap — Fuji is a shape long before it is a mountain. */
function MountFuji() {
  return (
    <group>
      <mesh position={[0, 0.09, 0]} material={rock}>
        <coneGeometry args={[0.17, 0.18, 22]} />
      </mesh>
      <mesh position={[0, 0.148, 0]} material={snow}>
        <coneGeometry args={[0.066, 0.07, 22]} />
      </mesh>
    </group>
  )
}

/** Everest: a sharper, taller peak with a long snow line and a shoulder. */
function Everest() {
  return (
    <group>
      <mesh position={[-0.09, 0.05, 0.03]} material={rock}>
        <coneGeometry args={[0.08, 0.1, 5]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={rock}>
        <coneGeometry args={[0.13, 0.24, 5]} />
      </mesh>
      <mesh position={[0, 0.202, 0]} material={snow}>
        <coneGeometry args={[0.055, 0.08, 5]} />
      </mesh>
      <mesh position={[-0.09, 0.086, 0.03]} material={snow}>
        <coneGeometry args={[0.034, 0.032, 5]} />
      </mesh>
    </group>
  )
}

/** Stone terraces stepping up to a peak. */
function MachuPicchu() {
  return (
    <group>
      <mesh position={[0.05, 0.115, -0.04]} material={rock}>
        <coneGeometry args={[0.075, 0.23, 6]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.03, 0.018 + i * 0.028, 0.03]} material={stone}>
          <boxGeometry args={[0.19 - i * 0.045, 0.026, 0.11 - i * 0.026]} />
        </mesh>
      ))}
      <mesh position={[-0.075, 0.105, 0.045]} material={marble}>
        <boxGeometry args={[0.03, 0.032, 0.03]} />
      </mesh>
      <mesh position={[0.02, 0.105, 0.05]} material={forest}>
        <sphereGeometry args={[0.022, 8, 8]} />
      </mesh>
    </group>
  )
}

/** The Easter Island heads: a long face on a heavy jaw. */
function Moai() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} material={darkStone}>
        <boxGeometry args={[0.11, 0.04, 0.08]} />
      </mesh>
      <mesh position={[0, 0.115, 0]} material={rock}>
        <boxGeometry args={[0.105, 0.16, 0.085]} />
      </mesh>
      {/* A heavy brow and a jutting chin are what make it a moai. */}
      <mesh position={[0, 0.16, 0.05]} material={darkStone}>
        <boxGeometry args={[0.105, 0.026, 0.022]} />
      </mesh>
      <mesh position={[0, 0.055, 0.038]} material={rock}>
        <boxGeometry args={[0.085, 0.05, 0.03]} />
      </mesh>
      <mesh position={[0, 0.208, 0]} material={sandDark}>
        <cylinderGeometry args={[0.045, 0.05, 0.035, 10]} />
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
  {
    id: 'wall',
    name: 'Great Wall',
    emoji: '🏯',
    country: 'China',
    lon: 116.57,
    lat: 40.43,
    say: 'The Great Wall of China. It is so long it would take months to walk!',
    build: GreatWall,
  },
  {
    id: 'opera',
    name: 'Sydney Opera House',
    emoji: '🎭',
    country: 'Australia',
    lon: 151.21,
    lat: -33.86,
    say: 'The Sydney Opera House in Australia. Its roof looks like big white sails!',
    build: OperaHouse,
  },
  {
    id: 'redeemer',
    name: 'Christ the Redeemer',
    emoji: '🙌',
    country: 'Brazil',
    lon: -43.21,
    lat: -22.95,
    say: 'Christ the Redeemer in Brazil. He stands on a mountain with arms wide open!',
    build: Redeemer,
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    emoji: '🏛️',
    country: 'Italy',
    lon: 12.49,
    lat: 41.89,
    say: 'The Colosseum in Rome, Italy. Fifty thousand people once watched games here!',
    build: Colosseum,
  },
  {
    id: 'bigben',
    name: 'Big Ben',
    emoji: '🕰️',
    country: 'United Kingdom',
    lon: -0.1246,
    lat: 51.5007,
    say: 'Big Ben in London. It is a giant bell inside a clock tower!',
    build: BigBen,
  },
  {
    id: 'fuji',
    name: 'Mount Fuji',
    emoji: '🗻',
    country: 'Japan',
    lon: 138.73,
    lat: 35.36,
    say: 'Mount Fuji in Japan. It is a volcano with snow on top!',
    build: MountFuji,
  },
  {
    id: 'everest',
    name: 'Mount Everest',
    emoji: '🏔️',
    country: 'Nepal',
    lon: 86.925,
    lat: 27.988,
    say: 'Mount Everest in Nepal. It is the tallest mountain in the whole world!',
    build: Everest,
  },
  {
    id: 'machu',
    name: 'Machu Picchu',
    emoji: '🏞️',
    country: 'Peru',
    lon: -72.545,
    lat: -13.163,
    say: 'Machu Picchu in Peru. It is a stone city high up in the clouds!',
    build: MachuPicchu,
  },
  {
    id: 'moai',
    name: 'Easter Island',
    emoji: '🗿',
    country: 'Chile',
    lon: -109.35,
    lat: -27.12,
    say: 'The giant stone heads of Easter Island, out in the Pacific Ocean!',
    build: Moai,
  },
]
