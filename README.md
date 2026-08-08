# 🌍 My First 3D Atlas

A single-screen 3D world atlas for children aged 6–8. Spin the planet, tap a
country, hear about it, and play three little geography games — all without a
single instruction screen.

Everything lives on one page. There is no router, no backend and no API key.

```bash
npm install
npm run dev
```

## What a child can do

| | |
| --- | --- |
| 🌎 **Explore** | Drag to spin, pinch or scroll to zoom, tap any country for its card. |
| 🏳️ **Flags** | "Which flag is Japan?" — three big flags, one tap. |
| 🗺️ **Find It** | "Find Australia on the globe!" — hunt for it, with hints and a **Show me** rescue. |
| 🐼 **Animals** | "Where does the panda live?" — pick the country from three. |

The 🗺️ button in the header unrolls the planet into a flat wall map and rolls it
back up again. Everything keeps working either way: tapping, highlighting,
landmarks and all four games.

Every country card carries a **Tell Me Like I'm 7** line: one sentence, under
twelve words, easy vocabulary, happy tone. A 🔊 **Listen** button reads the
whole card aloud, and ⭐ **Save Favorite** pins a country to the shelf on the
left. Stars and favourites persist in `localStorage`.

Four cartoon landmarks float on the surface — the Eiffel Tower, Taj Mahal,
Statue of Liberty and the Pyramids of Giza. Tapping one makes it bounce, flies
the camera to its country and says a sentence about it.

## How it works

The globe is not a downloaded texture. At start-up the app paints an
equirectangular world map onto a `<canvas>` from real country polygons
(`world-atlas` TopoJSON, 241 countries), then wraps it around a sphere.

That choice buys a few things at once:

- **Picking is exact.** A tap gives a UV on the sphere, which converts straight
  back to longitude/latitude, and `d3-geo`'s `geoContains` says which country
  is under the finger. No invisible hit meshes, no colour-index buffer.
- **Highlighting is cheap.** A second, slightly larger sphere carries a
  transparent canvas holding at most two repainted country outlines — the one
  under the finger and the chosen one.
- **Colours are deliberate.** Each continent owns a five-shade ramp, and a
  greedy graph colouring over overlapping bounding boxes guarantees no two
  neighbours share a shade. See `assignColors()` in `src/lib/world.ts`.

Two more spheres sit on top: hand-painted drifting clouds, and a fresnel
atmosphere shader for the rim glow. A slowly orbiting directional light gives
the day/night terminator; ambient light keeps the night side dusky rather than
black, because this is a toy and not an observatory.

The flatten is the same trick in reverse. A globe's UV layout *is* an
equirectangular map, so a small `onBeforeCompile` patch lets every layer slide
its vertices between the sphere they were built as and the rectangle their UVs
describe — one geometry, one draw call, no morph targets (`src/lib/morph.ts`).
The sun swings round to light the chart from the front, the halo fades out, the
clouds thin, and the landmarks lie down flat alongside it.

Sound is generated in the browser — Web Audio oscillators for the taps and
fanfares, `speechSynthesis` for the narration — so there are no audio files to
ship or wait for.

## Layout

```
src/
  App.tsx                  one screen, all panels stacked over the canvas
  store.ts                 zustand: selection, mode, stars, favourites
  data/
    countries.ts           241 countries — capital, language, fact, kid line
    games.ts               famous-country pool and the animal deck
  lib/
    world.ts               map data, colouring, texture painting, hit testing
    audio.ts               generated sound effects and speech
    useMediaQuery.ts
  components/
    globe/                 Canvas, Earth, Landmarks, camera rig
    Header, InfoCard, LearningBar, GamePanel, Favourites, …
```

## Responsive behaviour

The camera works out how far back to sit from the viewport aspect ratio, so the
whole planet fits on a tall phone and on a wide laptop. On large screens the
info card floats to the right of the globe; on small screens it slides up from
the bottom, and during a game it collapses to just the flag, the name and the
"Tell Me Like I'm 7" line so the question above stays visible.

## Stack

React 19 · TypeScript · React Three Fiber + drei · Framer Motion · Tailwind
CSS 4 · zustand · d3-geo · world-atlas. Vite for the build.

## Scripts

```bash
npm run dev       # dev server
npm run build     # typecheck + production build
npm run preview   # serve the production build
npm run lint      # oxlint
```
