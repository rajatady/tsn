export interface GameDetail {
  id: string
  title: string
  subtitle: string
  studio: string
  genre: string
  tagline: string
  summary: string
  whatsNew: string
  rating: string
}

export const ruralLife: GameDetail = {
  id: 'rural-life',
  title: 'Japanese Rural Life Adventure',
  subtitle: 'Country experience simulation',
  studio: 'GAME START LLC',
  genre: 'Simulation',
  tagline: 'Slow living in the Japanese countryside.',
  summary: 'Live in the Japanese countryside surrounded by nature. Fix up an old house, make the yard nice, grow your own crops, and become self-sufficient.',
  whatsNew: 'Daily quests have been added. Some bugs have been fixed.',
  rating: '4.9',
}

export const dredege: GameDetail = {
  id: 'dredge',
  title: 'DREDGE+',
  subtitle: 'A sinister fishing adventure',
  studio: 'Black Salt Games',
  genre: 'Adventure',
  tagline: 'A haunting voyage beneath the fog.',
  summary: 'Captain a weathered trawler, fish strange waters, and bring home what the deep would rather keep.',
  whatsNew: 'Performance is smoother and archive saves now sync correctly.',
  rating: '4.8',
}

export const helloKitty: GameDetail = {
  id: 'hello-kitty',
  title: 'Hello Kitty Island Adventure',
  subtitle: 'Island adventures await',
  studio: 'Sunblink',
  genre: 'Adventure',
  tagline: 'A bright world of friendship and exploration.',
  summary: 'Meet familiar friends, restore island magic, and build a warm little routine full of discoveries.',
  whatsNew: 'New quests, improved gifting, and cleaner travel menus.',
  rating: '4.7',
}

export function gameFromRoute(route: string): GameDetail {
  if (route === 'game:dredge') return dredege
  if (route === 'game:hello-kitty') return helloKitty
  return ruralLife
}
