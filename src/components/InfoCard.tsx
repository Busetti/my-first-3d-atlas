import { AnimatePresence, motion } from 'framer-motion'
import { CONTINENTS, type Country } from '../data/countries'
import { useAtlas } from '../store'
import { sfx, speak } from '../lib/audio'
import { useMediaQuery } from '../lib/useMediaQuery'
import { Flag } from './Flag'

export function InfoCard() {
  const selected = useAtlas((s) => s.selected)
  const mode = useAtlas((s) => s.mode)
  const wide = useMediaQuery('(min-width: 1024px)')

  // On a phone the card and a game question share the same screen, so during a
  // game it shrinks to just the bit a child wants after answering.
  const compact = !wide && mode !== 'explore'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[124px] z-30 flex justify-center px-3 sm:bottom-[136px] lg:inset-x-auto lg:top-28 lg:right-5 lg:bottom-auto lg:block lg:px-0">
      <AnimatePresence mode="wait">
        {selected && <Card key={selected.mapName} country={selected} compact={compact} />}
      </AnimatePresence>
    </div>
  )
}

function Card({ country, compact }: { country: Country; compact: boolean }) {
  const close = useAtlas((s) => s.select)
  const favourites = useAtlas((s) => s.favourites)
  const toggleFavourite = useAtlas((s) => s.toggleFavourite)
  const isFavourite = favourites.includes(country.mapName)
  const continent = CONTINENTS[country.continent]

  const script = [
    country.name,
    `The capital city is ${country.capital}.`,
    `It is in ${country.continentName}.`,
    `People speak ${country.language}.`,
    country.fact,
    country.kid,
  ].join(' ')

  return (
    <motion.section
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="glass pointer-events-auto max-h-[58vh] w-full max-w-[440px] overflow-y-auto rounded-[24px] p-3.5 sm:p-4 lg:max-h-[calc(100dvh-250px)] lg:w-[390px] xl:w-[430px]"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Flag emoji={country.flag} className="text-[42px] drop-shadow-lg sm:text-[50px]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-outline truncate text-[25px] leading-tight font-extrabold sm:text-[30px]">{country.name}</h2>
          <span
            className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-extrabold text-[#241549]"
            style={{ background: continent.color }}
          >
            {continent.emoji} {country.continentName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            sfx('tap')
            close(null)
          }}
          aria-label="Close"
          className="squish grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-lg"
        >
          ✕
        </button>
      </div>

      {!compact && (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Row icon="🏛️" label="Capital" value={country.capital} tint="#ff5d8f" />
            <Row icon="🗣️" label="Language" value={country.language} tint="#3ec1ff" />
          </dl>

          <div className="mt-2.5 rounded-[20px] border-2 border-white/25 bg-white/12 px-3.5 py-2.5">
            <p className="text-[12px] font-extrabold tracking-wide text-[#ffe08a] uppercase">✨ Fun Fact</p>
            <p className="mt-0.5 text-[17px] leading-snug font-bold">{country.fact}</p>
          </div>
        </>
      )}

      {/* The whole point of the app: one sentence a seven-year-old can repeat. */}
      <div className="mt-2.5 rounded-[20px] border-2 border-[#ffd647]/60 bg-gradient-to-br from-[#ff9d4d]/35 to-[#ff5d8f]/35 px-3.5 py-2.5">
        <p className="text-[12px] font-extrabold tracking-wide text-white uppercase">🧒 Tell Me Like I’m 7</p>
        <p className="mt-0.5 text-[20px] leading-snug font-extrabold sm:text-[22px]">{country.kid}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            sfx('tap')
            speak(script)
          }}
          className="squish flex h-14 items-center justify-center gap-2 rounded-[20px] bg-gradient-to-b from-[#5fd6ff] to-[#2b8fe0] text-[19px] font-extrabold text-white shadow-lg shadow-sky-900/40"
        >
          🔊 Listen
        </button>
        <button
          type="button"
          onClick={() => toggleFavourite(country.mapName)}
          aria-pressed={isFavourite}
          className={`squish flex h-14 items-center justify-center gap-2 rounded-[20px] text-[19px] font-extrabold shadow-lg transition-colors ${
            isFavourite
              ? 'bg-gradient-to-b from-[#ffe27a] to-[#ffb300] text-[#3a2400] shadow-amber-900/40'
              : 'bg-white/18 text-white shadow-black/30'
          }`}
        >
          {isFavourite ? '⭐ Saved!' : '☆ Save'}
        </button>
      </div>
    </motion.section>
  )
}

function Row({ icon, label, value, tint }: { icon: string; label: string; value: string; tint: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-[18px] bg-white/12 px-2.5 py-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-full text-lg" style={{ background: `${tint}40` }}>
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-extrabold tracking-wide text-white/70 uppercase">{label}</dt>
        {/* Wraps rather than truncates: "Washington, D.C." cut to "Washington, …"
            is worse than a second line, and a child cannot hover for a tooltip. */}
        <dd className="text-[17px] leading-tight font-extrabold break-words hyphens-auto">{value}</dd>
      </div>
    </div>
  )
}
