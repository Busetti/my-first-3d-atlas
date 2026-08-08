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
]

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
