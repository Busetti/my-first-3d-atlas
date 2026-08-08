import { COUNTRY_BY_MAP_NAME, type Country } from './countries'

/** Countries a 6-to-8-year-old is most likely to have heard of. */
const FAMOUS_NAMES = [
  'India', 'China', 'Japan', 'Brazil', 'Australia', 'Canada', 'United States of America', 'Mexico',
  'France', 'Germany', 'Italy', 'Spain', 'United Kingdom', 'Egypt', 'Kenya', 'South Africa',
  'Nigeria', 'Russia', 'Argentina', 'Peru', 'Chile', 'Norway', 'Sweden', 'Finland', 'Iceland',
  'Netherlands', 'Switzerland', 'Greece', 'Portugal', 'Ireland', 'Turkey', 'Indonesia', 'Thailand',
  'Vietnam', 'South Korea', 'New Zealand', 'Saudi Arabia', 'Morocco', 'Ethiopia', 'Tanzania',
  'Pakistan', 'Bangladesh', 'Nepal', 'Sri Lanka', 'Poland', 'Ukraine', 'Colombia', 'Cuba', 'Jamaica',
  'Ghana', 'Madagascar', 'Costa Rica', 'Ecuador', 'Philippines', 'Malaysia', 'Denmark', 'Belgium',
  'Austria', 'Israel', 'Iraq', 'Uganda',
]

export const FAMOUS: Country[] = FAMOUS_NAMES.map((n) => COUNTRY_BY_MAP_NAME.get(n)).filter(
  (c): c is Country => Boolean(c),
)

export interface AnimalCard {
  emoji: string
  name: string
  /** Map name of the country the animal is famous for. */
  home: string
  say: string
}

export const ANIMALS: AnimalCard[] = [
  { emoji: '🐼', name: 'panda', home: 'China', say: 'The panda lives in China, munching bamboo all day!' },
  { emoji: '🦘', name: 'kangaroo', home: 'Australia', say: 'The kangaroo lives in Australia and hops really high!' },
  { emoji: '🐯', name: 'tiger', home: 'India', say: 'The tiger lives in India, deep in the tall grass!' },
  { emoji: '🦁', name: 'lion', home: 'Kenya', say: 'Lions live in Kenya, out on the sunny grasslands!' },
  { emoji: '🐧', name: 'penguin', home: 'Antarctica', say: 'Penguins live in Antarctica, where everything is icy!' },
  { emoji: '🦥', name: 'sloth', home: 'Costa Rica', say: 'The sloth lives in Costa Rica and moves very, very slowly!' },
  { emoji: '🐫', name: 'camel', home: 'Egypt', say: 'Camels live in Egypt and walk across the hot desert!' },
  { emoji: '🦒', name: 'giraffe', home: 'Tanzania', say: 'Giraffes live in Tanzania and nibble the tallest leaves!' },
  { emoji: '🐘', name: 'elephant', home: 'Thailand', say: 'Elephants live in Thailand and love splashing in rivers!' },
  { emoji: '🦅', name: 'bald eagle', home: 'United States of America', say: 'The bald eagle lives in the United States and soars high!' },
  { emoji: '🐻', name: 'bear', home: 'Canada', say: 'Bears live in Canada, in the big green forests!' },
  { emoji: '🦜', name: 'macaw', home: 'Brazil', say: 'The macaw lives in Brazil, in the Amazon rainforest!' },
  { emoji: '🦙', name: 'llama', home: 'Peru', say: 'Llamas live in Peru, up in the tall mountains!' },
  { emoji: '🦧', name: 'orangutan', home: 'Indonesia', say: 'The orangutan lives in Indonesia, swinging through the trees!' },
  { emoji: '🦌', name: 'reindeer', home: 'Finland', say: 'Reindeer live in Finland, where it snows a lot!' },
  { emoji: '🐑', name: 'sheep', home: 'New Zealand', say: 'Sheep live in New Zealand, on soft green hills!' },
  { emoji: '🐢', name: 'giant tortoise', home: 'Ecuador', say: 'Giant tortoises live in Ecuador, on the Galápagos Islands!' },
  { emoji: '🐆', name: 'leopard', home: 'Sri Lanka', say: 'Leopards live in Sri Lanka and love climbing trees!' },
  { emoji: '🦏', name: 'rhino', home: 'South Africa', say: 'Rhinos live in South Africa and have a big strong horn!' },
  { emoji: '🦛', name: 'hippo', home: 'Uganda', say: 'Hippos live in Uganda and spend all day in the water!' },
  { emoji: '🐨', name: 'koala', home: 'Australia', say: 'Koalas live in Australia and nap for most of the day!' },
  { emoji: '🐒', name: 'snow monkey', home: 'Japan', say: 'Snow monkeys live in Japan and bathe in warm springs!' },
  { emoji: '🦫', name: 'beaver', home: 'Canada', say: 'Beavers live in Canada and build dams out of sticks!' },
  { emoji: '🦩', name: 'flamingo', home: 'Chile', say: 'Flamingos live in Chile and stand on one pink leg!' },
  { emoji: '🐺', name: 'wolf', home: 'Russia', say: 'Wolves live in Russia and howl at the moon!' },
  { emoji: '🦈', name: 'great white shark', home: 'South Africa', say: 'Great white sharks swim near South Africa!' },
  { emoji: '🦚', name: 'peacock', home: 'India', say: 'The peacock lives in India and fans a rainbow tail!' },
  { emoji: '🦭', name: 'seal', home: 'Greenland', say: 'Seals live in Greenland and swim under the ice!' },
  { emoji: '🐎', name: 'wild horse', home: 'Mongolia', say: 'Wild horses gallop across the grasslands of Mongolia!' },
  { emoji: '🦬', name: 'bison', home: 'Poland', say: 'Bison live in Poland, in a very old forest!' },
  { emoji: '🐊', name: 'crocodile', home: 'Egypt', say: 'Crocodiles live in Egypt, in the river Nile!' },
  { emoji: '🐬', name: 'dolphin', home: 'Greece', say: 'Dolphins leap through the blue sea around Greece!' },
  { emoji: '🐄', name: 'cow', home: 'Switzerland', say: 'Cows in Switzerland wear bells on green mountains!' },
  { emoji: '🐐', name: 'goat', home: 'Morocco', say: 'Goats in Morocco climb right up into the trees!' },
  { emoji: '🐸', name: 'tree frog', home: 'Colombia', say: 'Tiny bright frogs live in the rainforests of Colombia!' },
  { emoji: '🦋', name: 'monarch butterfly', home: 'Mexico', say: 'Millions of monarch butterflies fly to Mexico each year!' },
  { emoji: '🐋', name: 'whale', home: 'Iceland', say: 'Huge whales swim in the cold sea around Iceland!' },
  { emoji: '🦦', name: 'otter', home: 'United Kingdom', say: 'Otters live in the rivers of the United Kingdom!' },
  { emoji: '🦢', name: 'swan', home: 'Ireland', say: 'Swans glide on the quiet lakes of Ireland!' },
  { emoji: '🦉', name: 'snowy owl', home: 'Norway', say: 'Snowy owls live in Norway, white as the snow!' },
  { emoji: '🦡', name: 'honey badger', home: 'Botswana', say: 'Honey badgers live in Botswana and fear nothing!' },
  { emoji: '🐿️', name: 'chipmunk', home: 'United States of America', say: 'Chipmunks live in America and stuff their cheeks with nuts!' },
]

/**
 * Where an animal lives, looked up across every country rather than only the
 * famous ones. Penguins live in Antarctica, which is on the map but is not a
 * country a flag quiz would ever ask about — resolving from the full atlas is
 * what stops such a round from having no right answer at all.
 */
export function homeOf(animal: AnimalCard): Country | null {
  return COUNTRY_BY_MAP_NAME.get(animal.home) ?? null
}

/** Every animal must have a real home, or its round would be unanswerable. */
export const ANIMAL_DECK: AnimalCard[] = ANIMALS.filter((a) => homeOf(a) !== null)

export interface Trip {
  from: Country
  to: Country
}

/**
 * A pair of far-apart countries to fly between. Neighbours make for a dull
 * journey, so the two have to be at least a third of the planet apart.
 */
export function makeTrip(previous: Trip | null): Trip {
  const pool = FAMOUS
  for (let attempt = 0; attempt < 60; attempt++) {
    const from = pool[Math.floor(Math.random() * pool.length)]
    const to = pool[Math.floor(Math.random() * pool.length)]
    if (from === to) continue
    if (previous && from === previous.from && to === previous.to) continue
    if (angleBetween(from, to) > 55) return { from, to }
  }
  return { from: pool[0], to: pool[Math.floor(pool.length / 2)] }
}

/** Great-circle separation between two countries, in degrees. */
export function angleBetween(a: Country, b: Country): number {
  const toRad = Math.PI / 180
  const [lonA, latA] = a.center
  const [lonB, latB] = b.center
  const cos =
    Math.sin(latA * toRad) * Math.sin(latB * toRad) +
    Math.cos(latA * toRad) * Math.cos(latB * toRad) * Math.cos((lonA - lonB) * toRad)
  return Math.acos(Math.min(1, Math.max(-1, cos))) / toRad
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Pick one item at random, never the one we just used. */
export function pickDifferent<T>(items: T[], previous: T | null): T {
  if (items.length <= 1) return items[0]
  let next = items[Math.floor(Math.random() * items.length)]
  while (next === previous) next = items[Math.floor(Math.random() * items.length)]
  return next
}
