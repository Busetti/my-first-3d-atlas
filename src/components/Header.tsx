import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ATLAS } from '../lib/world'
import { useAtlas } from '../store'
import { sfx } from '../lib/audio'
import { Flag } from './Flag'

export function Header() {
  const soundOn = useAtlas((s) => s.soundOn)
  const toggleSound = useAtlas((s) => s.toggleSound)
  const view = useAtlas((s) => s.view)
  const toggleView = useAtlas((s) => s.toggleView)
  const stars = useAtlas((s) => s.stars)

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center gap-3 p-3 sm:gap-4 sm:p-5">
      <motion.h1
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="pointer-events-auto flex shrink-0 items-center gap-2 text-outline text-[22px] leading-none font-extrabold tracking-tight sm:text-[30px]"
      >
        <span className="animate-float text-[30px] drop-shadow-[0_0_18px_rgba(90,200,255,0.9)] sm:text-[40px]">🌍</span>
        <span className="hidden bg-gradient-to-b from-white to-[#ffe08a] bg-clip-text text-transparent lg:inline">
          My First 3D Atlas
        </span>
        <span className="bg-gradient-to-b from-white to-[#ffe08a] bg-clip-text text-transparent lg:hidden">Atlas</span>
      </motion.h1>

      <SearchBox />

      <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <StarCount stars={stars} />
        <button
          type="button"
          onClick={toggleView}
          aria-label={view === 'globe' ? 'Show the flat map' : 'Show the round globe'}
          title={view === 'globe' ? 'Flatten it into a map' : 'Roll it back into a globe'}
          className="glass squish grid size-12 place-items-center rounded-full text-2xl sm:size-14 sm:text-[28px]"
        >
          {view === 'globe' ? '🗺️' : '🌐'}
        </button>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
          title={soundOn ? 'Sound is on' : 'Sound is off'}
          className="glass squish grid size-12 place-items-center rounded-full text-2xl sm:size-14 sm:text-[28px]"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  )
}

function StarCount({ stars }: { stars: number }) {
  return (
    <motion.div
      key={stars}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.22, 1] }}
      transition={{ duration: 0.45 }}
      className="glass flex h-12 items-center gap-1.5 rounded-full px-3 text-lg font-extrabold sm:h-14 sm:px-4 sm:text-xl"
      title="Stars you have earned"
    >
      <span className="text-xl sm:text-2xl">⭐</span>
      {stars}
    </motion.div>
  )
}

function SearchBox() {
  const select = useAtlas((s) => s.select)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const starts = ATLAS.filter((c) => c.name.toLowerCase().startsWith(q))
    const rest = ATLAS.filter((c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q))
    return [...starts, ...rest].slice(0, 6)
  }, [query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [])

  const choose = (index: number) => {
    const country = matches[index]
    if (!country) return
    sfx('pop')
    select(country, { fly: true })
    setQuery('')
    setOpen(false)
    ;(document.activeElement as HTMLElement)?.blur()
  }

  return (
    <div ref={box} className="pointer-events-auto relative min-w-0 flex-1 sm:max-w-md">
      <div className="glass flex h-12 items-center gap-2 rounded-full px-4 sm:h-14 sm:px-5">
        <span className="text-xl sm:text-2xl" aria-hidden>
          🔎
        </span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, matches.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              choose(active)
            } else if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder="Search a country…"
          aria-label="Search for a country"
          className="w-full min-w-0 bg-transparent text-[17px] font-bold text-white placeholder:text-white/60 focus:outline-none sm:text-xl"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="squish grid size-8 shrink-0 place-items-center rounded-full bg-white/20 text-base"
          >
            ✕
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && matches.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="glass absolute top-full left-0 mt-2 w-full overflow-hidden rounded-3xl p-2"
          >
            {matches.map((country, i) => (
              <li key={country.mapName}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-lg font-extrabold transition-colors ${
                    i === active ? 'bg-white/25' : 'hover:bg-white/15'
                  }`}
                >
                  <Flag emoji={country.flag} className="text-2xl" />
                  <span className="truncate">{country.name}</span>
                  <span className="ml-auto shrink-0 text-sm font-bold text-white/70">{country.continentName}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
