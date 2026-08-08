import { AnimatePresence, motion } from 'framer-motion'

export function LoadingVeil({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          // Never intercepts input: it has nothing to click, and while it fades
          // out it would otherwise sit over the buttons and eat the first tap.
          className="pointer-events-none absolute inset-0 z-[60] grid place-items-center bg-[radial-gradient(120%_100%_at_50%_0%,#2b1a6b_0%,#1a1150_45%,#0d0730_100%)]"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
              className="text-[86px] drop-shadow-[0_0_34px_rgba(90,200,255,0.85)] sm:text-[110px]"
            >
              🌍
            </motion.span>
            <p className="text-outline text-center text-[24px] font-extrabold sm:text-[30px]">
              Painting the planet<span className="animate-pulse">…</span>
            </p>
            <div className="h-3 w-52 overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#5fd6ff] via-[#ffd647] to-[#ff5d8f]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
