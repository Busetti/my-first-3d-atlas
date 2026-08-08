import { create } from 'zustand'
import type { Country } from './data/countries'
import { setSoundEnabled, sfx, stopSpeaking } from './lib/audio'

export type Mode = 'explore' | 'flags' | 'find' | 'animals' | 'fly'
export type View = 'globe' | 'flat'

const FAVOURITES_KEY = 'atlas.favourites'
const STARS_KEY = 'atlas.stars'
const SOUND_KEY = 'atlas.sound'
const VIEW_KEY = 'atlas.view'

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

interface AtlasState {
  mode: Mode
  /** Round planet, or the same map unrolled flat like a school wall chart. */
  view: View
  selected: Country | null
  /** Bumped on every pick so the mini-games can react even to a repeat pick. */
  pickCount: number
  hovered: string | null
  /** Country the current challenge wants the child to find, by map name. */
  target: string | null
  soundOn: boolean
  favourites: string[]
  stars: number
  /** Where the camera should swing to next; cleared once the move starts. */
  flyTo: FlyTarget | null
  /** The journey a plane is currently flying, if any. */
  flight: Flight | null
  celebrating: boolean

  setMode: (mode: Mode) => void
  toggleView: () => void
  select: (country: Country | null, options?: { fly?: boolean }) => void
  lookAt: (lon: number, lat: number, zoom?: number) => void
  setHovered: (mapName: string | null) => void
  setTarget: (mapName: string | null) => void
  clearFlyTo: () => void
  startFlight: (from: Country, to: Country) => void
  endFlight: () => void
  toggleSound: () => void
  toggleFavourite: (mapName: string) => void
  addStar: () => void
  celebrate: () => void
}

/** A point to swing the view to, with an optional distance multiplier. */
export interface FlyTarget {
  lon: number
  lat: number
  zoom: number
}

export interface Flight {
  from: Country
  to: Country
  /** Bumped per journey so the plane restarts even on a repeated route. */
  id: number
}

export const useAtlas = create<AtlasState>((set, get) => {
  const soundOn = localStorage.getItem(SOUND_KEY) !== 'off'
  setSoundEnabled(soundOn)

  return {
    mode: 'explore',
    view: localStorage.getItem(VIEW_KEY) === 'flat' ? 'flat' : 'globe',
    selected: null,
    pickCount: 0,
    hovered: null,
    target: null,
    soundOn,
    favourites: readList(FAVOURITES_KEY),
    stars: Number(localStorage.getItem(STARS_KEY) ?? 0),
    flyTo: null,
    flight: null,
    celebrating: false,

    setMode: (mode) => {
      sfx('pop')
      stopSpeaking()
      // Clear the card too: a leftover country from the last game only confuses
      // things, and every mode should start from a clean globe.
      set({ mode, target: null, selected: null, flight: null })
    },

    toggleView: () =>
      set((s) => {
        const view: View = s.view === 'globe' ? 'flat' : 'globe'
        localStorage.setItem(VIEW_KEY, view)
        sfx('whoosh')
        return { view }
      }),

    select: (country, options) => {
      if (!country) {
        set({ selected: null })
        return
      }
      set((s) => ({
        selected: country,
        pickCount: s.pickCount + 1,
        flyTo: options?.fly ? { lon: country.center[0], lat: country.center[1], zoom: 1 } : s.flyTo,
      }))
    },

    lookAt: (lon, lat, zoom = 1) => set({ flyTo: { lon, lat, zoom } }),

    setHovered: (mapName) => {
      if (get().hovered !== mapName) set({ hovered: mapName })
    },

    setTarget: (mapName) => set({ target: mapName }),

    clearFlyTo: () => set({ flyTo: null }),

    startFlight: (from, to) =>
      set((s) => ({
        flight: { from, to, id: (s.flight?.id ?? 0) + 1 },
        selected: null,
      })),

    endFlight: () => set({ flight: null }),

    toggleSound: () =>
      set((s) => {
        const next = !s.soundOn
        localStorage.setItem(SOUND_KEY, next ? 'on' : 'off')
        setSoundEnabled(next)
        if (next) sfx('pop')
        return { soundOn: next }
      }),

    toggleFavourite: (mapName) =>
      set((s) => {
        const has = s.favourites.includes(mapName)
        const favourites = has ? s.favourites.filter((f) => f !== mapName) : [...s.favourites, mapName]
        localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites))
        sfx(has ? 'tap' : 'star')
        return { favourites }
      }),

    addStar: () =>
      set((s) => {
        const stars = s.stars + 1
        localStorage.setItem(STARS_KEY, String(stars))
        return { stars }
      }),

    celebrate: () => {
      set({ celebrating: true })
      window.setTimeout(() => set({ celebrating: false }), 1600)
    },
  }
})
