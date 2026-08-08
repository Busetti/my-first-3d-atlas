import { motion } from 'framer-motion'
import { useAtlas, type Mode } from '../store'

const TABS: { id: Mode; emoji: string; title: string; hint: string; from: string; to: string }[] = [
  { id: 'explore', emoji: '🌎', title: 'Explore', hint: 'Tap countries', from: '#5fd6ff', to: '#2b8fe0' },
  { id: 'flags', emoji: '🏳️', title: 'Flags', hint: 'Guess the flag', from: '#ff9dbd', to: '#e8437b' },
  { id: 'find', emoji: '🗺️', title: 'Find It', hint: 'Hunt on the globe', from: '#7ceccf', to: '#17a883' },
  { id: 'animals', emoji: '🐼', title: 'Animals', hint: 'Where do I live?', from: '#ffd98a', to: '#f08a1c' },
  { id: 'memory', emoji: '🧠', title: 'Match', hint: 'Flag to name', from: '#ffb3cd', to: '#c8175a' },
  { id: 'fly', emoji: '✈️', title: 'Travel', hint: 'Fly the world', from: '#c4a6ff', to: '#7c4ddb' },
]

export function LearningBar() {
  const mode = useAtlas((s) => s.mode)
  const setMode = useAtlas((s) => s.setMode)

  return (
    <nav
      aria-label="Learning games"
      className="absolute inset-x-0 bottom-0 z-30 px-2 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
    >
      <motion.ul
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.25 }}
        className="glass mx-auto grid max-w-3xl grid-cols-6 gap-1 rounded-[24px] p-1.5 sm:gap-2 sm:p-2.5"
      >
        {TABS.map((tab) => {
          const active = mode === tab.id
          return (
            <li key={tab.id} className="min-w-0">
              <button
                type="button"
                onClick={() => setMode(tab.id)}
                aria-pressed={active}
                className="squish relative grid h-[70px] w-full place-items-center rounded-[20px] px-0.5 sm:h-[84px]"
                style={{
                  background: active ? `linear-gradient(180deg, ${tab.from}, ${tab.to})` : 'rgba(255,255,255,0.12)',
                  boxShadow: active ? `0 10px 26px -8px ${tab.to}` : 'none',
                }}
              >
                {active && (
                  <motion.span
                    layoutId="tab-ring"
                    className="pointer-events-none absolute inset-0 rounded-[20px] border-[3px] border-white/80"
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  />
                )}
                <span className={`text-[23px] leading-none sm:text-[30px] ${active ? 'animate-wiggle' : ''}`}>{tab.emoji}</span>
                <span className="mt-1 w-full truncate px-0.5 text-center text-[11px] leading-none font-extrabold sm:text-[16px]">
                  {tab.title}
                </span>
                <span className="mt-0.5 hidden w-full truncate px-0.5 text-center text-[11px] leading-none font-bold text-white/80 sm:block">
                  {tab.hint}
                </span>
              </button>
            </li>
          )
        })}
      </motion.ul>
    </nav>
  )
}
