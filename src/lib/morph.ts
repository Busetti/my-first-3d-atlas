import * as THREE from 'three'

/**
 * How unrolled the planet currently is: 0 is a globe, 1 is a flat wall map.
 * A single shared uniform drives the earth, the clouds, the highlight layer
 * and the landmarks, so every piece flattens together in one motion.
 */
export const morph = new THREE.Uniform(0)

/** Size of the unrolled map, keeping the 2:1 shape of an equirectangular chart. */
export const FLAT_W = 9
export const FLAT_H = 4.5

/**
 * Rewrites a stock three.js material so its vertices slide between the sphere
 * they were built as and the flat rectangle their UVs describe. Because the
 * globe's UV layout *is* the map layout, the flat position falls straight out
 * of `uv` — no second geometry and no hand-authored morph targets.
 *
 * `depth` separates the layers once they are flat, where they would otherwise
 * all collapse onto the same plane and fight over the z-buffer.
 */
export function applyMorph(material: THREE.Material, depth = 0) {
  const flat = `vec3( ( uv.x - 0.5 ) * ${FLAT_W.toFixed(2)}, ( uv.y - 0.5 ) * ${FLAT_H.toFixed(
    2,
  )}, ${depth.toFixed(3)} )`

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMorph = morph
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uMorph;')
      .replace(
        '#include <beginnormal_vertex>',
        'vec3 objectNormal = mix( normal, vec3( 0.0, 0.0, 1.0 ), uMorph );',
      )
      .replace('#include <begin_vertex>', `vec3 transformed = mix( position, ${flat}, uMorph );`)
  }
  material.customProgramCacheKey = () => `atlas-morph-${depth}`
}

/** Where a longitude/latitude sits once the map is flat. */
export function lonLatToFlat(lon: number, lat: number): [number, number, number] {
  return [(lon / 360) * FLAT_W, (lat / 180) * FLAT_H, 0]
}

/**
 * A longitude/latitude grid wrapped onto a sphere.
 *
 * three's own SphereGeometry nudges the UVs of the two pole rows half a cell
 * sideways, which is invisible on a ball and turns into a row of zigzag teeth
 * the moment the map unrolls. This keeps `u = column / columns` everywhere, so
 * the flattened rectangle has clean straight edges.
 */
export function globeGeometry(radius: number, columns = 160, rows = 96): THREE.BufferGeometry {
  const position: number[] = []
  const normal: number[] = []
  const uv: number[] = []
  const index: number[] = []

  for (let iy = 0; iy <= rows; iy++) {
    const v = iy / rows
    const theta = v * Math.PI
    for (let ix = 0; ix <= columns; ix++) {
      const u = ix / columns
      const phi = u * Math.PI * 2
      const x = -Math.cos(phi) * Math.sin(theta)
      const y = Math.cos(theta)
      const z = Math.sin(phi) * Math.sin(theta)
      position.push(x * radius, y * radius, z * radius)
      normal.push(x, y, z)
      uv.push(u, 1 - v)
    }
  }

  const stride = columns + 1
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < columns; ix++) {
      const a = iy * stride + ix
      const b = a + stride
      // Both triangles always, including the pole rows. They are degenerate on
      // the sphere and cost nothing, but they are what fills the top and bottom
      // edges of the map once it is flat.
      index.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(index)
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return geometry
}
