import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useAtlas } from '../../store'
import { countryAt, makeHighlightCanvas, paintClouds, paintEarth, paintHighlight, uvToLonLat } from '../../lib/world'
import { applyMorph, FLAT_H, FLAT_W, globeGeometry, morph } from '../../lib/morph'
import { sfx } from '../../lib/audio'

export const GLOBE_RADIUS = 2

function canvasTexture(canvas: HTMLCanvasElement, anisotropy: number) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

export function Earth({ maxAnisotropy }: { maxAnisotropy: number }) {
  const hovered = useAtlas((s) => s.hovered)
  const selected = useAtlas((s) => s.selected)
  const target = useAtlas((s) => s.target)
  const view = useAtlas((s) => s.view)
  const setHovered = useAtlas((s) => s.setHovered)
  const select = useAtlas((s) => s.select)

  const glowRef = useRef<THREE.Mesh>(null)

  // The painted planet is expensive, so it is built once and kept forever.
  const { earthTex, cloudTex, highlightCanvas, highlightTex } = useMemo(() => {
    // 4096 matches the pixels-per-degree you get at maximum zoom; phones stay
    // at 2048 because the memory matters more than crisp borders there.
    const size = window.innerWidth >= 600 ? 4096 : 2048
    const highlightCanvas = makeHighlightCanvas(2048)
    return {
      earthTex: canvasTexture(paintEarth(size), maxAnisotropy),
      cloudTex: canvasTexture(paintClouds(2048), maxAnisotropy),
      highlightCanvas,
      highlightTex: canvasTexture(highlightCanvas, maxAnisotropy),
    }
  }, [maxAnisotropy])

  // Built by hand rather than in JSX so each one can be taught how to flatten.
  const skins = useMemo(() => {
    const earth = new THREE.MeshLambertMaterial({ map: earthTex })
    applyMorph(earth, 0)

    const highlight = new THREE.MeshBasicMaterial({ map: highlightTex, transparent: true, depthWrite: false })
    applyMorph(highlight, 0.012)

    const clouds = new THREE.MeshLambertMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
    applyMorph(clouds, 0.06)

    return { earth, highlight, clouds }
  }, [earthTex, cloudTex, highlightTex])

  const shells = useMemo(
    () => ({
      earth: globeGeometry(GLOBE_RADIUS, 180, 110),
      highlight: globeGeometry(GLOBE_RADIUS * 1.003, 180, 110),
      clouds: globeGeometry(GLOBE_RADIUS * 1.022, 110, 70),
    }),
    [],
  )

  useEffect(() => {
    return () => {
      earthTex.dispose()
      cloudTex.dispose()
      highlightTex.dispose()
      skins.earth.dispose()
      skins.highlight.dispose()
      skins.clouds.dispose()
      shells.earth.dispose()
      shells.highlight.dispose()
      shells.clouds.dispose()
    }
  }, [earthTex, cloudTex, highlightTex, skins, shells])

  useEffect(() => {
    paintHighlight(highlightCanvas, hovered, selected?.mapName ?? null, target)
    highlightTex.needsUpdate = true
  }, [hovered, selected, target, highlightCanvas, highlightTex])

  useFrame((_, delta) => {
    // Ease the whole planet between round and flat.
    const goal = view === 'flat' ? 1 : 0
    if (Math.abs(morph.value - goal) > 0.0005) {
      morph.value += (goal - morph.value) * (1 - Math.pow(0.004, Math.min(delta, 0.05)))
    } else {
      morph.value = goal
    }

    // Sliding the texture drifts the clouds on a globe and on a flat map alike,
    // which spinning the mesh would not.
    cloudTex.offset.x = (cloudTex.offset.x + delta * 0.0022) % 1

    // Clouds make a planet look alive; on a wall chart they just fog up the
    // countries a child is trying to read, so they mostly clear away.
    skins.clouds.opacity = 0.3 - 0.22 * morph.value

    if (glowRef.current) {
      const m = glowRef.current.material as THREE.ShaderMaterial
      m.uniforms.uTime.value += delta
      m.uniforms.uMorph.value = morph.value
    }
  })

  const readPointer = (event: ThreeEvent<PointerEvent>) => {
    if (!event.uv) return null
    const [lon, lat] = uvToLonLat(event.uv.x, event.uv.y)
    return countryAt(lon, lat)
  }

  const onMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHovered(readPointer(event)?.mapName ?? null)
  }

  // Spinning the planet must not open a card. Anything that travelled more
  // than a few pixels between press and release was a drag, not a tap.
  const pressedAt = useRef<[number, number] | null>(null)

  const onPress = (event: ThreeEvent<PointerEvent>) => {
    pressedAt.current = [event.clientX, event.clientY]
  }

  const onTap = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const from = pressedAt.current
    pressedAt.current = null
    if (from && Math.hypot(event.clientX - from[0], event.clientY - from[1]) > 7) return
    const country = readPointer(event)
    if (!country) return
    sfx('tap')
    // On a wide screen the card lands off to the right, so it is worth sliding
    // the country clear of it. On a phone the card covers the middle whatever
    // we do, and moving the map on every tap only makes it harder to follow —
    // the gold highlight is enough to say "this is the one you picked". During
    // a game the view never moves, so a wrong guess does not drag the map out
    // from under a child mid-hunt.
    const { mode } = useAtlas.getState()
    select(country, { fly: mode === 'explore' && window.innerWidth >= 1024 })
  }

  return (
    <group>
      <mesh raycast={() => null} material={skins.earth} geometry={shells.earth} />

      {/* Glow layer for the country under the finger and the chosen one. */}
      <mesh raycast={() => null} material={skins.highlight} geometry={shells.highlight} />

      <mesh raycast={() => null} material={skins.clouds} geometry={shells.clouds} />

      <Atmosphere ref={glowRef} />

      {/*
        Taps land here. The visible planet is reshaped in a vertex shader, which
        the raycaster knows nothing about, so picking uses a plain unmorphed
        shape that matches whichever view is showing. Both give the same UVs,
        so the longitude/latitude lookup is identical either way.
      */}
      <mesh
        key={view}
        onPointerMove={onMove}
        onPointerOut={() => setHovered(null)}
        onPointerDown={onPress}
        onClick={onTap}
        onPointerMissed={() => setHovered(null)}
      >
        {view === 'globe' ? (
          <sphereGeometry args={[GLOBE_RADIUS, 64, 48]} />
        ) : (
          <planeGeometry args={[FLAT_W, FLAT_H]} />
        )}
        <meshBasicMaterial colorWrite={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** A soft fresnel halo so the planet sits in the scene instead of on top of it. */
function Atmosphere({ ref }: { ref: React.Ref<THREE.Mesh> }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uMorph: { value: 0 } },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uMorph;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float rim = pow(1.0 - abs(dot(vNormal, vView)), 4.2);
            float pulse = 0.88 + 0.12 * sin(uTime * 0.9);
            vec3 inner = vec3(0.36, 0.76, 1.0);
            vec3 outer = vec3(0.66, 0.48, 1.0);
            vec3 col = mix(inner, outer, rim);
            // The halo belongs to a planet, so it fades away as the map flattens.
            gl_FragColor = vec4(col, rim * 0.95 * pulse * (1.0 - uMorph));
          }
        `,
      }),
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh ref={ref} raycast={() => null} material={material}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.14, 64, 48]} />
    </mesh>
  )
}
