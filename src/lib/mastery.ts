import type { Country } from '../data/countries'

/**
 * A quiet record of how well each country is known, so the games can put the
 * hard ones in front of a child more often than the easy ones.
 *
 * This is the whole "how do I remember these?" answer: a country met once and
 * never seen again is forgotten, and a country you keep getting wrong is the
 * one worth asking about. Nothing here is ever shown — it just bends which
 * questions come up.
 */

const KEY = 'atlas.mastery'

interface Score {
  /** How many times it has been asked about. */
  seen: number
  /** How many of those went wrong. */
  wrong: number
  /** Rounds ago it was last asked, as a simple counter. */
  last: number
}

type Book = Record<string, Score>

let book: Book = load()
let clock = 0

function load(): Book {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Book) : {}
  } catch {
    return {}
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(book))
  } catch {
    // A full or blocked store is not worth breaking a game over.
  }
}

/** Note how a child did on a country. */
export function record(mapName: string, correct: boolean) {
  const entry = book[mapName] ?? { seen: 0, wrong: 0, last: 0 }
  entry.seen += 1
  if (!correct) entry.wrong += 1
  entry.last = ++clock
  book[mapName] = entry
  save()
}

/**
 * How badly a country needs practice. Never seen scores highest, then ones
 * that have gone wrong, and anything asked very recently is damped down so the
 * same few do not repeat back to back.
 */
function needsPractice(mapName: string): number {
  const entry = book[mapName]
  if (!entry) return 6
  const missRate = entry.wrong / Math.max(1, entry.seen)
  const freshness = clock - entry.last
  const recentlyAsked = freshness < 3 ? 0.25 : 1
  return (1 + missRate * 8) * recentlyAsked
}

/** Weighted draw of distinct countries, favouring the ones worth practising. */
export function pickForPractice(pool: Country[], count: number): Country[] {
  const remaining = [...pool]
  const chosen: Country[] = []

  while (chosen.length < count && remaining.length > 0) {
    const weights = remaining.map((c) => needsPractice(c.mapName))
    const total = weights.reduce((a, b) => a + b, 0)
    let ticket = Math.random() * total
    let index = 0
    while (index < weights.length - 1 && ticket > weights[index]) {
      ticket -= weights[index]
      index += 1
    }
    chosen.push(remaining[index])
    remaining.splice(index, 1)
  }

  return chosen
}

/** How many countries the child has answered correctly at least once. */
export function learnedCount(): number {
  return Object.values(book).filter((e) => e.seen > e.wrong).length
}

export function resetMastery() {
  book = {}
  clock = 0
  save()
}
