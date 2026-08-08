import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { CONTINENTS, type Country } from '../data/countries'
import {
  ANIMAL_DECK,
  angleBetween,
  FAMOUS,
  homeOf,
  makeTrip,
  pickDifferent,
  shuffle,
  type AnimalCard,
  type Trip,
} from '../data/games'
import { FINDABLE, lonLatToVector, vectorToLonLat } from '../lib/world'
import { pickForPractice, record } from '../lib/mastery'
import { sfx, speak } from '../lib/audio'
import { useAtlas } from '../store'
import { Flag } from './Flag'

type Feedback = 'idle' | 'right' | 'wrong' | 'shown'

export function GamePanel() {
  const mode = useAtlas((s) => s.mode)

  return (
    // Tucked into the left column on a wide screen so the globe stays in view
    // beside it; across the top on a phone, where there is no room to the side.
    <div className="pointer-events-none absolute inset-x-0 top-[76px] z-20 flex justify-center px-3 sm:top-[96px] lg:inset-x-auto lg:left-5 lg:justify-start lg:px-0">
      <AnimatePresence mode="wait">
        {mode === 'flags' && <FlagGame key="flags" />}
        {mode === 'find' && <FindGame key="find" />}
        {mode === 'animals' && <AnimalGame key="animals" />}
        {mode === 'memory' && <MemoryGame key="memory" />}
        {mode === 'fly' && <FlyGame key="fly" />}
      </AnimatePresence>
    </div>
  )
}

// ── Shared shell ──────────────────────────────────────────────────────────

function Panel({ children }: { children: ReactNode }) {
  const setMode = useAtlas((s) => s.setMode)
  return (
    <motion.section
      initial={{ opacity: 0, y: -26, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      data-atlas-panel
      className="glass pointer-events-auto relative w-full max-w-[560px] rounded-[24px] p-3.5 sm:p-5 lg:w-[420px]"
    >
      <button
        type="button"
        onClick={() => setMode('explore')}
        aria-label="Close the game and go back to exploring"
        title="Close"
        className="squish absolute -top-2.5 -right-2.5 z-10 grid size-9 place-items-center rounded-full border-2 border-white/40 bg-[#2a1a66] text-lg text-white shadow-lg"
      >
        ✕
      </button>
      {children}
    </motion.section>
  )
}

function Question({ children, onRepeat }: { children: ReactNode; onRepeat: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-outline flex-1 text-center text-[20px] leading-tight font-extrabold sm:text-[26px]">{children}</h2>
      <button
        type="button"
        onClick={onRepeat}
        aria-label="Say the question again"
        className="squish grid size-11 shrink-0 place-items-center rounded-full bg-white/20 text-xl"
      >
        🔊
      </button>
    </div>
  )
}

/** Reused by both multiple-choice games so right/wrong always feels the same. */
function useChoiceRound(onWin: () => void) {
  const addStar = useAtlas((s) => s.addStar)
  const celebrate = useAtlas((s) => s.celebrate)
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [wrongKey, setWrongKey] = useState<string | null>(null)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const answer = useCallback(
    (correct: boolean, key: string, say: string) => {
      if (feedback === 'right') return
      if (correct) {
        setFeedback('right')
        setWrongKey(null)
        sfx('yay')
        addStar()
        celebrate()
        speak(say)
        timer.current = window.setTimeout(() => {
          setFeedback('idle')
          onWin()
        }, 2600)
      } else {
        setFeedback('wrong')
        setWrongKey(key)
        sfx('oops')
        speak('Not quite. Try again!')
        timer.current = window.setTimeout(() => setFeedback('idle'), 900)
      }
    },
    [feedback, addStar, celebrate, onWin],
  )

  return { feedback, wrongKey, answer }
}

// ── 🏳️ Flags ───────────────────────────────────────────────────────────────

function FlagGame() {
  const select = useAtlas((s) => s.select)
  const [round, setRound] = useState(() => makeFlagRound(null))
  const next = useCallback(() => setRound((r) => makeFlagRound(r.target)), [])
  const { feedback, wrongKey, answer } = useChoiceRound(next)

  const ask = useCallback(() => speak(`Which flag is ${round.target.name}?`), [round])
  useEffect(() => {
    const id = window.setTimeout(ask, 350)
    return () => window.clearTimeout(id)
  }, [ask])

  return (
    <Panel>
      <Question onRepeat={ask}>
        Which flag is <span className="text-[#ffe08a]">{round.target.name}</span>?
      </Question>

      <div className="mt-3.5 grid grid-cols-3 gap-2 sm:gap-3">
        {round.options.map((country) => {
          const isRight = country.mapName === round.target.mapName
          const state = feedback === 'right' && isRight ? 'right' : wrongKey === country.mapName ? 'wrong' : 'idle'
          return (
            <motion.button
              key={country.mapName}
              type="button"
              animate={state === 'wrong' ? { x: [0, -9, 9, -6, 6, 0] } : state === 'right' ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.45 }}
              onClick={() => {
                record(round.target.mapName, isRight)
                if (isRight) select(country, { fly: true })
                answer(isRight, country.mapName, `Yes! That is the flag of ${country.name}. ${country.kid}`)
              }}
              className={`squish grid h-[104px] place-items-center rounded-[20px] border-[3px] transition-colors sm:h-[124px] ${
                state === 'right'
                  ? 'border-[#7ceccf] bg-[#31d0aa]/40'
                  : state === 'wrong'
                    ? 'border-[#ff8fae] bg-[#ff5d8f]/30'
                    : 'border-white/25 bg-white/12'
              }`}
              aria-label={country.name}
            >
              <Flag emoji={country.flag} className="text-[52px] drop-shadow-lg sm:text-[68px]" />
              {state === 'right' && <span className="mt-1 text-sm font-extrabold">{country.name}</span>}
            </motion.button>
          )
        })}
      </div>

      <Feedbackline feedback={feedback} right="Yes! You got it! 🎉" wrong="Almost! Have another go 😊" idle="Tap the right flag" />
    </Panel>
  )
}

function makeFlagRound(previous: Country | null) {
  // Ask about whichever flag is least well known rather than a random one.
  const [first, second] = pickForPractice(FAMOUS, 2)
  const target = first === previous ? second : first
  const others = shuffle(FAMOUS.filter((c) => c.mapName !== target.mapName)).slice(0, 2)
  return { target, options: shuffle([target, ...others]) }
}

// ── 🗺️ Find It ─────────────────────────────────────────────────────────────

/** Only the chunkiest countries, so hunting is fun rather than frustrating. */
const FIND_POOL = FINDABLE.slice(0, 70)

function FindGame() {
  const pickCount = useAtlas((s) => s.pickCount)
  const selected = useAtlas((s) => s.selected)
  const setTarget = useAtlas((s) => s.setTarget)
  const select = useAtlas((s) => s.select)
  const addStar = useAtlas((s) => s.addStar)
  const celebrate = useAtlas((s) => s.celebrate)

  const [target, setLocal] = useState(() => pickDifferent(FIND_POOL, null))
  const [feedback, setFeedback] = useState<Feedback>('idle')
  const [misses, setMisses] = useState(0)
  const seen = useRef(pickCount)
  const timer = useRef<number>(0)
  /** Set while "Show me" is answering for the child, so it earns no star. */
  const revealing = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => () => setTarget(null), [setTarget])

  const ask = useCallback(() => speak(`Find ${target.name} on the globe!`), [target])
  useEffect(() => {
    const id = window.setTimeout(ask, 350)
    return () => window.clearTimeout(id)
  }, [ask])

  const nextRound = useCallback(() => {
    setLocal((t) => pickDifferent(FIND_POOL, t))
    setFeedback('idle')
    setMisses(0)
    setTarget(null)
  }, [setTarget])

  // Every tap on the globe counts as a guess.
  useEffect(() => {
    if (pickCount === seen.current) return
    seen.current = pickCount
    if (feedback === 'right' || !selected) return

    // The child pressed "Show me" — teach the answer, but no star for it.
    if (revealing.current) {
      revealing.current = false
      setFeedback('shown')
      timer.current = window.setTimeout(nextRound, 3200)
      return
    }

    if (selected.mapName === target.mapName) {
      setFeedback('right')
      sfx('yay')
      addStar()
      celebrate()
      speak(`You found ${target.name}! ${target.kid}`)
      timer.current = window.setTimeout(nextRound, 3000)
    } else {
      setFeedback('wrong')
      setMisses((m) => m + 1)
      sfx('oops')
      speak(`That is ${selected.name}. Keep looking!`)
      timer.current = window.setTimeout(() => setFeedback('idle'), 1200)
    }
  }, [pickCount, selected, target, feedback, addStar, celebrate, nextRound])

  const reveal = () => {
    if (feedback === 'right') return
    sfx('pop')
    revealing.current = true
    setTarget(target.mapName)
    select(target, { fly: true })
    speak(`Here is ${target.name}. ${target.kid}`)
  }

  return (
    <Panel>
      <Question onRepeat={ask}>
        Find <span className="text-[#ffe08a]">{target.name}</span> on the globe!
      </Question>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-full bg-white/15 px-3.5 py-2 text-[15px] font-extrabold sm:text-[17px]">
          {CONTINENTS[target.continent].emoji}{' '}
          {/* Saying "Antarctica is in Antarctica" helps nobody. */}
          {target.name === target.continentName ? 'Look right at the bottom!' : `It is in ${target.continentName}`}
        </span>
        {misses >= 2 && feedback !== 'right' && (
          <span className="rounded-full bg-white/15 px-3.5 py-2 text-[15px] font-extrabold sm:text-[17px]">
            🏛️ Capital: {target.capital}
          </span>
        )}
        <button
          type="button"
          onClick={reveal}
          className="squish rounded-full bg-gradient-to-b from-[#ffe27a] to-[#ffb300] px-4 py-2 text-[15px] font-extrabold text-[#3a2400] sm:text-[17px]"
        >
          👀 Show me
        </button>
        <button
          type="button"
          onClick={() => {
            sfx('pop')
            nextRound()
          }}
          className="squish rounded-full bg-white/18 px-4 py-2 text-[15px] font-extrabold sm:text-[17px]"
        >
          🔁 New one
        </button>
      </div>

      <Feedbackline
        feedback={feedback}
        right={`Brilliant! That is ${target.name}! 🎉`}
        wrong="Not that one — keep hunting! 🔍"
        shown={`There it is — that is ${target.name}! 👀`}
        idle="Spin the globe and tap the country"
      />
    </Panel>
  )
}

// ── 🐼 Animals ─────────────────────────────────────────────────────────────

function AnimalGame() {
  const select = useAtlas((s) => s.select)
  const [round, setRound] = useState(() => makeAnimalRound(null))
  const next = useCallback(() => setRound((r) => makeAnimalRound(r.animal)), [])
  const { feedback, wrongKey, answer } = useChoiceRound(next)

  const ask = useCallback(() => speak(`Where does the ${round.animal.name} live?`), [round])
  useEffect(() => {
    const id = window.setTimeout(ask, 350)
    return () => window.clearTimeout(id)
  }, [ask])

  return (
    <Panel>
      <div className="flex items-center gap-3">
        <motion.span
          key={round.animal.emoji}
          initial={{ scale: 0.4, rotate: -18 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className="animate-float text-[56px] leading-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.45)] sm:text-[72px]"
        >
          {round.animal.emoji}
        </motion.span>
        <div className="min-w-0 flex-1">
          <Question onRepeat={ask}>
            Where does the <span className="text-[#ffe08a]">{round.animal.name}</span> live?
          </Question>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2 sm:grid-cols-3 sm:gap-3">
        {round.options.map((country) => {
          const isRight = country.mapName === round.home?.mapName
          const state = feedback === 'right' && isRight ? 'right' : wrongKey === country.mapName ? 'wrong' : 'idle'
          return (
            <motion.button
              key={country.mapName}
              type="button"
              animate={state === 'wrong' ? { x: [0, -9, 9, -6, 6, 0] } : state === 'right' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.45 }}
              onClick={() => {
                if (isRight) select(country, { fly: true })
                answer(isRight, country.mapName, round.animal.say)
              }}
              className={`squish flex items-center justify-center gap-2 rounded-[20px] border-[3px] px-3 py-3.5 text-[18px] font-extrabold transition-colors sm:flex-col sm:py-4 ${
                state === 'right'
                  ? 'border-[#7ceccf] bg-[#31d0aa]/40'
                  : state === 'wrong'
                    ? 'border-[#ff8fae] bg-[#ff5d8f]/30'
                    : 'border-white/25 bg-white/12'
              }`}
            >
              <Flag emoji={country.flag} className="text-[34px] sm:text-[44px]" />
              <span className="truncate">{country.name}</span>
            </motion.button>
          )
        })}
      </div>

      <Feedbackline feedback={feedback} right="Yes! That is its home! 🎉" wrong="Not there — try again 😊" idle="Tap the country it calls home" />
    </Panel>
  )
}

function makeAnimalRound(previous: AnimalCard | null) {
  const animal = pickDifferent(ANIMAL_DECK, previous)
  // Looked up across the whole atlas, not just the famous list: the penguin
  // lives in Antarctica, which the famous list does not contain, and searching
  // only there left that round with three wrong answers and no right one.
  const home = homeOf(animal)
  const others = shuffle(FAMOUS.filter((c) => c.mapName !== animal.home)).slice(0, 2)
  return { animal, home, options: shuffle([...(home ? [home] : []), ...others]) }
}

// ── 🧠 Match ───────────────────────────────────────────────────────────────

interface MemoryCard {
  key: string
  country: Country
  kind: 'flag' | 'name'
}

const PAIRS = 6

function makeBoard(): MemoryCard[] {
  return shuffle(
    pickForPractice(FAMOUS, PAIRS).flatMap((country) => [
      { key: `${country.mapName}-flag`, country, kind: 'flag' as const },
      { key: `${country.mapName}-name`, country, kind: 'name' as const },
    ]),
  )
}

/**
 * Pairs, the oldest memory game there is, pointed at the one thing a child most
 * needs to stick: this flag belongs to this name. Turning two cards over and
 * being wrong is what makes the right answer memorable, so a miss costs nothing
 * but a moment.
 */
function MemoryGame() {
  const select = useAtlas((s) => s.select)
  const addStar = useAtlas((s) => s.addStar)
  const celebrate = useAtlas((s) => s.celebrate)

  const [board, setBoard] = useState(makeBoard)
  const [faceUp, setFaceUp] = useState<number[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [tries, setTries] = useState(0)
  const timer = useRef<number>(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const solved = matched.length === PAIRS

  useEffect(() => {
    if (!solved) return
    sfx('star')
    celebrate()
    speak('You matched them all! Well done!')
    timer.current = window.setTimeout(() => {
      setBoard(makeBoard())
      setFaceUp([])
      setMatched([])
      setTries(0)
    }, 3200)
  }, [solved, celebrate])

  const flip = (index: number) => {
    const card = board[index]
    if (faceUp.length === 2 || faceUp.includes(index) || matched.includes(card.country.mapName)) return

    const next = [...faceUp, index]
    setFaceUp(next)
    if (next.length < 2) {
      sfx('tap')
      return
    }

    setTries((t) => t + 1)
    const [a, b] = next.map((i) => board[i])
    const isPair = a.country.mapName === b.country.mapName && a.kind !== b.kind
    record(a.country.mapName, isPair)

    if (isPair) {
      sfx('yay')
      addStar()
      speak(a.country.name)
      select(a.country)
      timer.current = window.setTimeout(() => {
        setMatched((m) => [...m, a.country.mapName])
        setFaceUp([])
      }, 700)
    } else {
      sfx('oops')
      timer.current = window.setTimeout(() => setFaceUp([]), 1100)
    }
  }

  return (
    <Panel>
      <Question onRepeat={() => speak('Match each flag to its country name!')}>
        Match the <span className="text-[#ffe08a]">flag</span> to its name!
      </Question>

      <div className="mt-3.5 grid grid-cols-3 gap-2" style={{ perspective: 900 }}>
        {board.map((card, index) => {
          const isMatched = matched.includes(card.country.mapName)
          const up = isMatched || faceUp.includes(index)
          return (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => flip(index)}
              aria-label={up ? card.country.name : 'Hidden card'}
              animate={{ rotateY: up ? 180 : 0, scale: isMatched ? 0.95 : 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative h-[62px] sm:h-[70px]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <span
                className="absolute inset-0 grid place-items-center rounded-[18px] border-[3px] border-white/25 bg-gradient-to-br from-[#7c6cff]/60 to-[#3ec1ff]/50 text-[24px]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                🌍
              </span>
              <span
                className={`absolute inset-0 grid place-items-center gap-0.5 rounded-[18px] border-[3px] px-1 ${
                  isMatched ? 'border-[#7ceccf] bg-[#31d0aa]/35' : 'border-white/30 bg-white/15'
                }`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {card.kind === 'flag' ? (
                  <Flag emoji={card.country.flag} className="text-[30px] sm:text-[34px]" />
                ) : (
                  <span className="text-center text-[12px] leading-tight font-extrabold break-words sm:text-[13px]">
                    {card.country.name}
                  </span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>

      <p className="animate-pop-in mt-3 text-center text-[16px] font-extrabold sm:text-[18px]">
        {solved ? (
          <span className="text-[#9cf3d6]">All matched in {tries} tries! 🎉</span>
        ) : (
          <span className="text-white/75">
            {matched.length} of {PAIRS} found
          </span>
        )}
      </p>
    </Panel>
  )
}

// ── ✈️ Travel ──────────────────────────────────────────────────────────────

function FlyGame() {
  const startFlight = useAtlas((s) => s.startFlight)
  const flight = useAtlas((s) => s.flight)
  const lookAt = useAtlas((s) => s.lookAt)
  const [trip, setTrip] = useState<Trip>(() => makeTrip(null))
  const flying = flight !== null

  const shuffleTrip = useCallback(() => {
    sfx('pop')
    setTrip((t) => makeTrip(t))
  }, [])

  const takeOff = () => {
    if (flying) return
    // Pull the camera back far enough to watch the whole journey, aimed at the
    // halfway point rather than at either end.
    const mid = midpoint(trip)
    lookAt(mid[0], mid[1], routeZoom(trip))
    startFlight(trip.from, trip.to)
  }

  // Once the plane is up, the panel gets out of its own way: the whole point of
  // this mode is watching the journey, and a full-size card would cover it.
  if (flying) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        data-atlas-panel
        className="glass pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-2.5 sm:gap-3 sm:px-5"
      >
        <Flag emoji={trip.from.flag} className="text-[24px] sm:text-[28px]" />
        <motion.span
          aria-hidden
          animate={{ x: [-5, 5, -5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-[22px] sm:text-[26px]"
        >
          ✈️
        </motion.span>
        <Flag emoji={trip.to.flag} className="text-[24px] sm:text-[28px]" />
        <span className="truncate text-[15px] font-extrabold sm:text-[17px]">Flying to {trip.to.name}…</span>
      </motion.div>
    )
  }

  return (
    <Panel>
      <Question onRepeat={() => speak(`Let's fly from ${trip.from.name} to ${trip.to.name}!`)}>
        Let’s fly to <span className="text-[#ffe08a]">{trip.to.name}</span>!
      </Question>

      <div className="mt-3.5 flex items-center justify-center gap-2 sm:gap-3">
        <Airport country={trip.from} label="From" />
        <span aria-hidden className="text-[28px] sm:text-[34px]">
          ✈️
        </span>
        <Airport country={trip.to} label="To" />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={takeOff}
          className="squish rounded-full bg-gradient-to-b from-[#7ceccf] to-[#17a883] px-5 py-2.5 text-[17px] font-extrabold text-[#03301f] shadow-lg shadow-emerald-900/40 sm:text-[19px]"
        >
          🛫 Take off!
        </button>
        <button
          type="button"
          onClick={shuffleTrip}
          className="squish rounded-full bg-white/18 px-4 py-2.5 text-[15px] font-extrabold sm:text-[17px]"
        >
          🔁 New trip
        </button>
      </div>

      <p className="animate-pop-in mt-3 text-center text-[16px] font-extrabold text-white/75 sm:text-[18px]">
        About {kilometres(trip)} km — press take off!
      </p>
    </Panel>
  )
}

function Airport({ country, label }: { country: Country; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[20px] border-[3px] border-white/25 bg-white/12 px-2 py-2.5">
      <span className="text-[11px] font-extrabold tracking-wide text-white/70 uppercase">{label}</span>
      <Flag emoji={country.flag} className="text-[30px] sm:text-[38px]" />
      <span className="w-full truncate text-center text-[15px] leading-tight font-extrabold sm:text-[17px]">
        {country.name}
      </span>
    </div>
  )
}

/** Halfway along the great circle, so the camera watches the middle of the trip. */
function midpoint(trip: Trip): [number, number] {
  const a = new THREE.Vector3(...lonLatToVector(trip.from.center[0], trip.from.center[1]))
  const b = new THREE.Vector3(...lonLatToVector(trip.to.center[0], trip.to.center[1]))
  const mid = a.add(b)
  // Exact opposites cancel out and leave nothing to aim at.
  if (mid.lengthSq() < 1e-6) mid.set(0, 1, 0)
  mid.normalize()
  return vectorToLonLat(mid.x, mid.y, mid.z)
}

/** Longer journeys need the camera further back to fit the whole arc. */
function routeZoom(trip: Trip): number {
  return THREE.MathUtils.clamp(1 + angleBetween(trip.from, trip.to) / 190, 1.05, 1.75)
}

function kilometres(trip: Trip): number {
  // Rounded to the nearest hundred; the number is for wonder, not navigation.
  return Math.round((angleBetween(trip.from, trip.to) * 111.32) / 100) * 100
}

// ── Feedback strip ────────────────────────────────────────────────────────

function Feedbackline({
  feedback,
  right,
  wrong,
  idle,
  shown,
}: {
  feedback: Feedback
  right: string
  wrong: string
  idle: string
  shown?: string
}) {
  const text =
    feedback === 'right' ? right : feedback === 'wrong' ? wrong : feedback === 'shown' ? (shown ?? idle) : idle
  const tone =
    feedback === 'right'
      ? 'text-[#9cf3d6]'
      : feedback === 'wrong'
        ? 'text-[#ffb3c8]'
        : feedback === 'shown'
          ? 'text-[#ffe08a]'
          : 'text-white/75'
  return (
    <p key={text} className={`animate-pop-in mt-3 text-center text-[16px] font-extrabold sm:text-[18px] ${tone}`}>
      {text}
    </p>
  )
}
