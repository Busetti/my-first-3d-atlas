import { AnimatePresence, motion } from 'framer-motion'
import { COUNTRY_BY_MAP_NAME } from '../data/countries'
import { useAtlas } from '../store'
import { Flag } from './Flag'

/**
 * The one line of guidance in the whole app. It names whatever is under the
 * finger, and when nothing is, it says what to do next.
 */
export function HoverPill() {
  const hovered = useAtlas((s) => s.hovered)
  const mode = useAtlas((s) => s.mode)
  const view = useAtlas((s) => s.view)
  const selected = useAtlas((s) => s.selected)

  const country = hovered ? COUNTRY_BY_MAP_NAME.get(hovered) : undefined
  const label = country
    ? { key: country.mapName, node: <><Flag emoji={country.flag} className="text-2xl" />{country.name}</> }
    : mode === 'explore' && !selected
      ? { key: 'hint', node: <>👆 Tap any country to learn about it!</> }
      : view === 'flat'
        ? { key: 'drag', node: <>🖐️ Drag the map • pinch to zoom</> }
        : { key: 'spin', node: <>🖐️ Drag to spin • pinch to zoom</> }

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-[104px] z-20 justify-center px-4 sm:bottom-[118px] ${
        selected ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={label.key}
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          className="glass-soft flex items-center gap-2 rounded-full px-4 py-2 text-[16px] font-extrabold text-white/95 sm:text-[19px]"
        >
          {label.node}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
