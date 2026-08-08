import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import type { Line2 } from 'three-stdlib'
import * as THREE from 'three'
import { GLOBE_RADIUS } from './Earth'
import { lonLatToVector } from '../../lib/world'
import { lonLatToFlat, morph } from '../../lib/morph'
import { useAtlas } from '../../store'
import { sfx, speak } from '../../lib/audio'

/** How long a journey takes, in seconds. Long enough to enjoy, short enough to sit through. */
const DURATION = 6.5

/** How far the plane arcs above the surface at the halfway point. */
const CRUISE = 0.4

/** Points used to draw the vapour trail. */
const TRAIL = 90

/**
 * A little plane that takes off from one country and lands in another, leaving
 * a vapour trail behind it. On the globe it follows a great circle — the route
 * a real aeroplane would take — and on the flat chart it follows the same two
 * points across the paper, so the two views agree about where it went.
 */
export function Flight() {
  const flight = useAtlas((s) => s.flight)
  const endFlight = useAtlas((s) => s.endFlight)
  const select = useAtlas((s) => s.select)
  const addStar = useAtlas((s) => s.addStar)
  const celebrate = useAtlas((s) => s.celebrate)

  const plane = useRef<THREE.Group>(null)
  const trail = useRef<Line2>(null)
  const progress = useRef(0)
  const landed = useRef(false)

  const route = useMemo(() => {
    if (!flight) return null
    return {
      roundFrom: new THREE.Vector3(...lonLatToVector(flight.from.center[0], flight.from.center[1])),
      roundTo: new THREE.Vector3(...lonLatToVector(flight.to.center[0], flight.to.center[1])),
      flatFrom: new THREE.Vector3(...lonLatToFlat(flight.from.center[0], flight.from.center[1])),
      flatTo: new THREE.Vector3(...lonLatToFlat(flight.to.center[0], flight.to.center[1])),
    }
  }, [flight])

  // Scratch vectors, reused every frame so the flight allocates nothing.
  const scratch = useMemo(
    () => ({ here: new THREE.Vector3(), ahead: new THREE.Vector3(), up: new THREE.Vector3(), round: new THREE.Vector3(), flat: new THREE.Vector3() }),
    [],
  )
  const trailPoints = useMemo(() => new Float32Array(TRAIL * 3), [])

  useEffect(() => {
    progress.current = 0
    landed.current = false
    if (flight) {
      sfx('whoosh')
      speak(`Taking off from ${flight.from.name}, flying to ${flight.to.name}!`)
    }
  }, [flight])

  /** Where the plane is at 0..1 along the journey, for the current view. */
  const pointAt = (t: number, out: THREE.Vector3) => {
    if (!route) return out

    // Great circle on the globe: rotate one end towards the other.
    const dot = THREE.MathUtils.clamp(route.roundFrom.dot(route.roundTo), -1, 1)
    const omega = Math.acos(dot)
    if (omega < 1e-4) {
      scratch.round.copy(route.roundFrom)
    } else {
      const a = Math.sin((1 - t) * omega) / Math.sin(omega)
      const b = Math.sin(t * omega) / Math.sin(omega)
      scratch.round.copy(route.roundFrom).multiplyScalar(a).addScaledVector(route.roundTo, b).normalize()
    }
    const lift = Math.sin(Math.PI * t) * CRUISE
    scratch.round.multiplyScalar(GLOBE_RADIUS + lift)

    // Straight across the flat chart, rising off the paper towards the viewer.
    scratch.flat.lerpVectors(route.flatFrom, route.flatTo, t)
    scratch.flat.z = lift

    return out.lerpVectors(scratch.round, scratch.flat, morph.value)
  }

  useFrame((_, delta) => {
    if (!flight || !route) return

    if (!landed.current) {
      progress.current = Math.min(1, progress.current + delta / DURATION)
      if (progress.current >= 1) {
        landed.current = true
        sfx('yay')
        addStar()
        celebrate()
        select(flight.to, { fly: true })
        speak(`We have landed in ${flight.to.name}! ${flight.to.kid}`)
        window.setTimeout(endFlight, 2200)
      }
    }

    const t = progress.current

    if (plane.current) {
      pointAt(t, scratch.here)
      pointAt(Math.min(1, t + 0.008), scratch.ahead)
      plane.current.position.copy(scratch.here)

      // Keep the plane's belly towards the ground, whichever shape the world is.
      scratch.up.copy(scratch.here).normalize().lerp(FLAT_UP, morph.value).normalize()
      plane.current.up.copy(scratch.up)
      if (scratch.ahead.distanceToSquared(scratch.here) > 1e-8) plane.current.lookAt(scratch.ahead)

      // Climb out and flare in, so take-off and landing read as such.
      const tilt = Math.cos(Math.PI * t) * 0.35
      plane.current.rotateX(-tilt)
      // Sit on the ground until the wheels are up.
      plane.current.visible = true
    }

    // Draw the trail behind the plane, collapsing the unflown part onto it.
    if (trail.current) {
      for (let i = 0; i < TRAIL; i++) {
        const at = Math.min(t, (i / (TRAIL - 1)) * t)
        pointAt(at, scratch.here)
        trailPoints[i * 3] = scratch.here.x
        trailPoints[i * 3 + 1] = scratch.here.y
        trailPoints[i * 3 + 2] = scratch.here.z
      }
      trail.current.geometry.setPositions(trailPoints)
    }
  })

  if (!flight) return null

  return (
    <group>
      <Line
        ref={trail}
        points={Array.from({ length: TRAIL }, () => [0, 0, 0] as [number, number, number])}
        color="#fff2b6"
        lineWidth={3}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
      <group ref={plane}>
        <Plane />
      </group>
      <Marker country={flight.from} kind="from" />
      <Marker country={flight.to} kind="to" />
    </group>
  )
}

const FLAT_UP = new THREE.Vector3(0, 0, 1)

/** A chunky toy aeroplane, nose along +Z. */
function Plane() {
  return (
    <group scale={1.7}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.1, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.016, 0.04, 12]} />
        <meshStandardMaterial color="#ff5d8f" roughness={0.45} />
      </mesh>
      {/* Wings */}
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[0.15, 0.006, 0.032]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[0.152, 0.004, 0.012]} />
        <meshStandardMaterial color="#3ec1ff" roughness={0.5} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0, -0.046]}>
        <boxGeometry args={[0.058, 0.005, 0.018]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.022, -0.05]}>
        <boxGeometry args={[0.005, 0.038, 0.026]} />
        <meshStandardMaterial color="#ff5d8f" roughness={0.5} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 0.006, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.05, 10]} />
        <meshStandardMaterial color="#2a1a66" emissive="#5fd6ff" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/** A pin standing on the runway at each end of the journey. */
function Marker({ country, kind }: { country: { center: [number, number] }; kind: 'from' | 'to' }) {
  const group = useRef<THREE.Group>(null)
  const shape = useMemo(
    () => ({
      round: new THREE.Vector3(...lonLatToVector(country.center[0], country.center[1])).multiplyScalar(GLOBE_RADIUS),
      flat: new THREE.Vector3(...lonLatToFlat(country.center[0], country.center[1])),
      roundTurn: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(...lonLatToVector(country.center[0], country.center[1])),
      ),
      flatTurn: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), FLAT_UP),
    }),
    [country.center],
  )

  useFrame((state) => {
    if (!group.current) return
    group.current.position.lerpVectors(shape.round, shape.flat, morph.value)
    group.current.quaternion.slerpQuaternions(shape.roundTurn, shape.flatTurn, morph.value)
    const bob = 1 + Math.sin(state.clock.elapsedTime * 3 + (kind === 'to' ? 1.6 : 0)) * 0.12
    group.current.scale.setScalar(bob)
  })

  const colour = kind === 'from' ? '#5fd6ff' : '#ffd647'
  return (
    <group ref={group}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.1, 6]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <sphereGeometry args={[0.024, 12, 12]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.068, 28]} />
        <meshBasicMaterial color={colour} transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}
