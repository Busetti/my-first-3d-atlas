import { AnimatePresence, motion } from 'framer-motion'
import { COUNTRY_BY_MAP_NAME } from '../data/countries'
import { useAtlas } from '../store'
import { sfx } from '../lib/audio'
import { useMediaQuery } from '../lib/useMediaQuery'
import { Flag } from './Flag'

/** A little shelf of the countries a child has starred, always one tap away. */
export function Favourites() {
  const favourites = useAtlas((s) => s.favourites)
  const select = useAtlas((s) => s.select)
  const selected = useAtlas((s) => s.selected)
  const wide = useMediaQuery('(min-width: 1024px)')

  const saved = favourites.map((name) => COUNTRY_BY_MAP_NAME.get(name)).filter((c) => c !== undefined)
  if (saved.length === 0) return null
  // On a phone the card already owns the bottom of the screen.
  if (!wide && selected) return null

  return (
    <motion.aside
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      aria-label="Your saved countries"
      // Low on the left, out of the way of the game panel above it.
      className="glass absolute bottom-[140px] left-2 z-30 flex max-h-[40vh] flex-col items-center gap-1.5 overflow-y-auto rounded-[24px] p-2 sm:bottom-[150px] sm:left-4 sm:gap-2 sm:p-2.5"
    >
      <span className="text-lg leading-none sm:text-xl" title="Saved countries">
        ⭐
      </span>
      <AnimatePresence initial={false}>
        {saved.map((country) => (
          <motion.button
            key={country.mapName}
            layout
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            type="button"
            title={country.name}
            aria-label={country.name}
            onClick={() => {
              sfx('tap')
              select(country, { fly: true })
            }}
            className={`squish grid size-11 shrink-0 place-items-center rounded-2xl border-2 sm:size-12 ${
              selected?.mapName === country.mapName ? 'border-[#ffd647] bg-white/25' : 'border-white/20 bg-white/10'
            }`}
          >
            <Flag emoji={country.flag} className="text-[26px] sm:text-[30px]" />
          </motion.button>
        ))}
      </AnimatePresence>
    </motion.aside>
  )
}
