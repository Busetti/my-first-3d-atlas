import { geoArea, geoBounds, geoCentroid, geoContains, geoEquirectangular, geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import worldTopo from 'world-atlas/countries-50m.json'
import { COUNTRY_BY_MAP_NAME, type Country } from '../data/countries'

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>

interface Shape {
  feature: CountryFeature
  /** [[west, south], [east, north]] — west may be > east across the date line. */
  bounds: [[number, number], [number, number]]
  /** Fraction of the sphere covered, used to pick fair "find it" targets. */
  area: number
  country: Country
}

const topology = worldTopo as unknown as Topology
const features = (
  feature(topology, topology.objects.countries) as unknown as { features: CountryFeature[] }
).features

/**
 * Continent palettes. Each country takes one shade from its continent's ramp so
 * that neighbours never share a colour, but a whole continent still reads as
 * one bright family.
 */
const PALETTE: Record<string, string[]> = {
  AF: ['#ffd23d', '#f5a207', '#ffe98a', '#d97706', '#ffbb52'],
  AS: ['#ff7fae', '#ff2e6e', '#ffb3cd', '#c8175a', '#ff5c92'],
  EU: ['#a996ff', '#6d4dff', '#cdc0ff', '#4d2bd6', '#8a6bff'],
  NA: ['#5cebc0', '#00c896', '#a8f5dc', '#00907a', '#25d8a8'],
  SA: ['#ffa85c', '#ff7a1f', '#ffca9c', '#d95c00', '#ff8f3d'],
  // Coral, not blue: Oceania is surrounded by ocean and needs to stand out.
  OC: ['#ff8a76', '#ff5335', '#ffb7a8', '#dd3418', '#ff6f57'],
  AN: ['#eaf6ff', '#cfe9ff', '#f7fbff', '#b9ddff', '#dff1ff'],
}

const shapes: Shape[] = []
const shapeByName = new Map<string, Shape>()
const colorByName = new Map<string, string>()

for (const f of features) {
  const country = COUNTRY_BY_MAP_NAME.get(f.properties.name)
  if (!country) continue

  const shape: Shape = {
    feature: f,
    bounds: geoBounds(f as unknown as GeoPermissibleObjects) as [[number, number], [number, number]],
    area: geoArea(f as unknown as GeoPermissibleObjects),
    country,
  }
  shapes.push(shape)
  shapeByName.set(f.properties.name, shape)
  country.center = biggestPieceCenter(f)
}

assignColors()

/**
 * Neighbouring countries must never share a shade, or the map turns into one
 * flat blob. Overlapping bounding boxes stand in for "shares a border", which
 * is generous — it just means more variety — and then a greedy pass hands out
 * the continent's ramp so the biggest, most-looked-at countries choose first.
 */
function assignColors() {
  const overlaps = (a: Shape, b: Shape) => {
    const [[aw, as_], [ae, an]] = a.bounds
    const [[bw, bs], [be, bn]] = b.bounds
    if (an < bs - 1 || bn < as_ - 1) return false
    // A box that crosses the date line has west > east; treat it as global.
    if (aw > ae || bw > be) return true
    return !(ae < bw - 1 || be < aw - 1)
  }

  const order = [...shapes].sort((a, b) => b.area - a.area)
  const chosen = new Map<Shape, string>()

  for (const shape of order) {
    const ramp = PALETTE[shape.country.continent]
    const taken = new Set<string>()
    for (const [other, color] of chosen) {
      if (other.country.continent === shape.country.continent && overlaps(shape, other)) taken.add(color)
    }
    const color = ramp.find((c) => !taken.has(c)) ?? ramp[chosen.size % ramp.length]
    chosen.set(shape, color)
    colorByName.set(shape.feature.properties.name, color)
  }
}

/**
 * Countries can be scattered across the planet (France owns islands in three
 * oceans). Averaging all of that lands the camera in the sea, so aim at the
 * middle of the largest single piece instead.
 */
function biggestPieceCenter(f: CountryFeature): [number, number] {
  if (f.geometry.type === 'Polygon') {
    return geoCentroid(f as unknown as GeoPermissibleObjects) as [number, number]
  }
  let best: Feature<Polygon> | null = null
  let bestArea = -1
  for (const coordinates of f.geometry.coordinates) {
    const piece: Feature<Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates },
    }
    const a = geoArea(piece as unknown as GeoPermissibleObjects)
    if (a > bestArea) {
      bestArea = a
      best = piece
    }
  }
  return geoCentroid(best as unknown as GeoPermissibleObjects) as [number, number]
}

/** Every country that actually has a shape on the globe, A→Z. */
export const ATLAS: Country[] = shapes
  .map((s) => s.country)
  .sort((a, b) => a.name.localeCompare(b.name))

/** Countries big enough for a 6-year-old to hunt down in the "Find It" game. */
export const FINDABLE: Country[] = shapes
  .filter((s) => s.area > 0.0016)
  .sort((a, b) => b.area - a.area)
  .map((s) => s.country)

export function countryColor(mapName: string): string {
  return colorByName.get(mapName) ?? '#ffffff'
}

// ── Coordinate helpers ────────────────────────────────────────────────────
// Sphere UVs and an equirectangular texture line up like this:
//   u = 0 → 180°W,  u = 1 → 180°E
//   v = 0 → 90°S,   v = 1 → 90°N

export function uvToLonLat(u: number, v: number): [number, number] {
  return [(u - 0.5) * 360, (v - 0.5) * 180]
}

/** Point on a unit sphere for a longitude/latitude, matching the UV layout above. */
export function lonLatToVector(lon: number, lat: number): [number, number, number] {
  const phi = ((lon + 180) / 360) * Math.PI * 2
  const theta = ((90 - lat) / 180) * Math.PI
  return [-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)]
}

/** Which country is under this longitude/latitude, if any. */
export function countryAt(lon: number, lat: number): Country | null {
  for (const s of shapes) {
    const [[west, south], [east, north]] = s.bounds
    if (lat < south - 0.4 || lat > north + 0.4) continue
    const insideLon = west <= east ? lon >= west - 0.4 && lon <= east + 0.4 : lon >= west - 0.4 || lon <= east + 0.4
    if (!insideLon) continue
    if (geoContains(s.feature as unknown as GeoPermissibleObjects, [lon, lat])) return s.country
  }
  return null
}

// ── Texture painting ──────────────────────────────────────────────────────

function makeCanvas(width: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = width / 2
  return canvas
}

function projectionFor(width: number) {
  return geoEquirectangular()
    .translate([width / 2, width / 4])
    .scale(width / (2 * Math.PI))
}

/** The painted planet: bright cartoon countries floating on a friendly ocean. */
export function paintEarth(width: number): HTMLCanvasElement {
  const canvas = makeCanvas(width)
  const h = canvas.height
  const ctx = canvas.getContext('2d')!

  // Lighter towards the poles, but only gently: an equirectangular map stretches
  // those rows into wide bands, and near-white ones look like missing data.
  const sea = ctx.createLinearGradient(0, 0, 0, h)
  sea.addColorStop(0, '#63c0f2')
  sea.addColorStop(0.22, '#3fa9f5')
  sea.addColorStop(0.5, '#1e7fd6')
  sea.addColorStop(0.78, '#3fa9f5')
  sea.addColorStop(1, '#63c0f2')
  ctx.fillStyle = sea
  ctx.fillRect(0, 0, width, h)

  // Faint current lines so the ocean is not a flat wall of blue.
  ctx.globalAlpha = 0.05
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 30; i++) {
    const y = (i / 30) * h + Math.sin(i * 2.3) * 16
    ctx.fillRect(0, y, width, Math.max(1, h / 420))
  }
  ctx.globalAlpha = 1

  const path = geoPath(projectionFor(width), ctx)
  const stroke = Math.max(2, width / 1100)

  // Soft drop shadow under the land so continents feel like stickers.
  ctx.save()
  ctx.translate(0, stroke * 2.5)
  ctx.fillStyle = 'rgba(6, 40, 82, 0.32)'
  for (const s of shapes) {
    ctx.beginPath()
    path(s.feature as unknown as GeoPermissibleObjects)
    ctx.fill()
  }
  ctx.restore()

  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  for (const s of shapes) {
    ctx.beginPath()
    path(s.feature as unknown as GeoPermissibleObjects)
    ctx.fillStyle = colorByName.get(s.feature.properties.name)!
    ctx.fill()
    ctx.stroke()
  }

  return canvas
}

/**
 * Transparent overlay holding at most two countries: the one under the finger
 * (soft white) and the chosen one (gold). Repainting two paths is cheap enough
 * to do on every pointer move.
 */
export function paintHighlight(
  canvas: HTMLCanvasElement,
  hovered: string | null,
  selected: string | null,
  target: string | null,
) {
  const ctx = canvas.getContext('2d')!
  const width = canvas.width
  ctx.clearRect(0, 0, width, canvas.height)
  const path = geoPath(projectionFor(width), ctx)

  const draw = (name: string, fill: string, line: string, lineWidth: number) => {
    const s = shapeByName.get(name)
    if (!s) return
    ctx.beginPath()
    path(s.feature as unknown as GeoPermissibleObjects)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = line
    ctx.stroke()
  }

  const unit = width / 1024
  if (target && target !== selected) draw(target, 'rgba(255, 255, 255, 0.16)', '#ffffff', 3 * unit)
  if (hovered && hovered !== selected) draw(hovered, 'rgba(255, 255, 255, 0.28)', '#ffffff', 3 * unit)
  if (selected) draw(selected, 'rgba(255, 205, 40, 0.45)', '#fff2b6', 4.5 * unit)
}

export function makeHighlightCanvas(width: number): HTMLCanvasElement {
  return makeCanvas(width)
}

/** Puffy cartoon clouds, drawn as overlapping soft blobs on a clear sheet. */
export function paintClouds(width: number): HTMLCanvasElement {
  const canvas = makeCanvas(width)
  const h = canvas.height
  const ctx = canvas.getContext('2d')!

  // Deterministic so the planet looks the same on every visit.
  let seed = 20260808
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  for (let i = 0; i < 80; i++) {
    const cx = rand() * width
    // Keep the poles clearer: equirectangular stretches everything up there.
    const cy = h * (0.16 + rand() * 0.68)
    const scale = (0.6 + rand() * 1.3) * (width / 1024)
    const puffs = 7 + Math.floor(rand() * 8)
    for (let p = 0; p < puffs; p++) {
      const r = (14 + rand() * 26) * scale
      const x = cx + (rand() - 0.5) * 160 * scale
      const y = cy + (rand() - 0.5) * 44 * scale
      const blob = ctx.createRadialGradient(x, y, 0, x, y, r)
      blob.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      blob.addColorStop(0.5, 'rgba(255, 255, 255, 0.45)')
      blob.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = blob
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return canvas
}
