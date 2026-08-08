import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'
import { useAtlas } from '../store'

const CONFETTI = ['⭐', '🎉', '✨', '🌟', '🎈', '💫']

/** A quick burst of confetti whenever a child gets an answer right. */
export function Celebration() {
  const celebrating = useAtlas((s) => s.celebrating)
  return <AnimatePresence>{celebrating && <Burst />}</AnimatePresence>
}

function Burst() {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        id: i,
        emoji: CONFETTI[i % CONFETTI.length],
        x: (Math.random() - 0.5) * 90,
        rotate: (Math.random() - 0.5) * 540,
        size: 20 + Math.random() * 26,
        delay: Math.random() * 0.25,
        duration: 1.1 + Math.random() * 0.7,
      })),
    [],
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          initial={{ opacity: 0, y: '-12vh', x: `${b.x * 0.2}vw`, rotate: 0, scale: 0.4 }}
          animate={{ opacity: [0, 1, 1, 0], y: '108vh', x: `${b.x}vw`, rotate: b.rotate, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: b.duration, delay: b.delay, ease: 'easeIn' }}
          className="absolute top-0 left-1/2 leading-none"
          style={{ fontSize: b.size }}
        >
          {b.emoji}
        </motion.span>
      ))}
    </div>
  )
}
