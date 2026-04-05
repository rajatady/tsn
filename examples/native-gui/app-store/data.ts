import {
  categoryFamilyImage,
  categoryPuzzleImage,
  categorySimulationImage,
  categoryStrategyImage,
  developHeroImage,
  developSpotlightImage,
  iconAngryBirds,
  iconBloons,
  iconCooking,
  iconCozy,
  iconCult,
  iconDreamlight,
  iconDredge,
  iconFelicity,
  iconHelloKitty,
  iconLego,
  iconNaruto,
  iconOceanhorn,
  iconPacman,
  iconRuralLife,
  iconSneaky,
  iconSpongeBob,
  iconTMNT,
  perkFamily,
  perkNewGames,
  perkNoAds,
  perkOverview,
  playCardOneImage,
  playCardThreeImage,
  playCardTwoImage,
  playHeroImage,
  ruralHeroImage,
  ruralScreenOneImage,
  ruralScreenTwoImage,
} from './assets'

export interface StoreApp {
  id: string
  title: string
  subtitle: string
  caption: string
  icon: string
  action: string
  route: string
}

export interface RankedApp {
  rank: string
  app: StoreApp
}

export interface Perk {
  title: string
  subtitle: string
  image: string
}

export interface EditorialCard {
  eyebrow: string
  title: string
  subtitle: string
  image: string
  route: string
}

export interface CategoryCard {
  title: string
  image: string
}

export interface Review {
  title: string
  body: string
  author: string
  age: string
}

export interface InfoPair {
  label: string
  value: string
}

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
  icon: string
  hero: string
  screenOne: string
  screenTwo: string
  reviews: Review[]
  info: InfoPair[]
}

export function arcadeChipList(): string[] {
  const chips: string[] = [
    'All Games',
    'Casual',
    'Strategy',
    'Family',
    'Adventure',
    'Sports',
    'Racing',
    'Simulation',
    'Word',
    'Puzzle',
    'Action',
  ]
  return chips
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
  icon: iconRuralLife,
  hero: ruralHeroImage,
  screenOne: ruralScreenOneImage,
  screenTwo: ruralScreenTwoImage,
  reviews: [
    {
      title: 'amazingly chill game',
      body: 'I have loved the game and enjoyed it every time I play. It keeps a very calm pace and still feels full of little discoveries.',
      author: 'theCrusifier',
      age: '2y ago',
    },
    {
      title: 'Tranquilizing',
      body: 'I can play whenever and wherever I want. It makes me loosen up and take my mind off while still feeling thoughtful.',
      author: 'Oxaniket',
      age: '2y ago',
    },
  ],
  info: [
    { label: 'Size', value: '233.8 MB' },
    { label: 'Compatibility', value: 'Works on this Mac' },
    { label: 'Language', value: 'English and 14 more' },
    { label: 'Age Rating', value: '4+' },
  ],
}

export const dredge: GameDetail = {
  id: 'dredge',
  title: 'DREDGE+',
  subtitle: 'A sinister fishing adventure',
  studio: 'Black Salt Games',
  genre: 'Adventure',
  tagline: 'A haunting voyage beneath the fog.',
  summary: 'Captain a weathered trawler, fish strange waters, and bring home what the deep would rather keep.',
  whatsNew: 'Performance is smoother and archive saves now sync correctly.',
  rating: '4.8',
  icon: iconDredge,
  hero: ruralHeroImage,
  screenOne: ruralScreenOneImage,
  screenTwo: ruralScreenTwoImage,
  reviews: ruralLife.reviews,
  info: ruralLife.info,
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
  icon: iconHelloKitty,
  hero: ruralHeroImage,
  screenOne: ruralScreenOneImage,
  screenTwo: ruralScreenTwoImage,
  reviews: ruralLife.reviews,
  info: ruralLife.info,
}

export function topStripApps(): StoreApp[] {
  const apps: StoreApp[] = [
    { id: 'dredge', title: 'DREDGE+', subtitle: 'Apple Arcade', caption: 'A sinister fishing adventure', icon: iconDredge, action: 'Get', route: 'game:dredge' },
    { id: 'felicity', title: "Felicity's Door", subtitle: 'Apple Arcade', caption: 'Music', icon: iconFelicity, action: 'Get', route: 'game:rural-life' },
    { id: 'cult', title: 'Cult of the Lamb', subtitle: 'Apple Arcade', caption: 'Arcade Edition', icon: iconCult, action: 'Get', route: 'game:rural-life' },
    { id: 'oceanhorn', title: 'Oceanhorn 3', subtitle: 'Apple Arcade', caption: 'Legend of the Shadow Sea', icon: iconOceanhorn, action: 'Get', route: 'game:rural-life' },
    { id: 'cozy', title: 'Cozy Caravan', subtitle: 'Apple Arcade', caption: 'Spread Happiness', icon: iconCozy, action: 'Get', route: 'game:rural-life' },
    { id: 'spongebob', title: 'SpongeBob: Patty Pursuit 2', subtitle: 'Apple Arcade', caption: 'Join Plankton in Bikini Bottom', icon: iconSpongeBob, action: 'Get', route: 'game:rural-life' },
  ]
  return apps
}

export function topArcadeGames(): RankedApp[] {
  const items: RankedApp[] = [
    { rank: '1', app: { id: 'sneaky', title: 'Sneaky Sasquatch', subtitle: 'Apple Arcade', caption: 'Stealthy shenanigans', icon: iconSneaky, action: 'Get', route: 'game:rural-life' } },
    { rank: '2', app: { id: 'nba', title: 'NBA 2K26 Arcade Edition', subtitle: 'Apple Arcade', caption: 'Make history in every era', icon: iconLego, action: 'Get', route: 'game:rural-life' } },
    { rank: '3', app: { id: 'powerwash', title: 'PowerWash Simulator', subtitle: 'Apple Arcade', caption: 'Release the pressure', icon: iconPacman, action: 'Get', route: 'game:rural-life' } },
    { rank: '4', app: { id: 'dredge-rank', title: 'DREDGE+', subtitle: 'Apple Arcade', caption: 'A sinister fishing adventure', icon: iconDredge, action: 'Get', route: 'game:dredge' } },
    { rank: '5', app: { id: 'snake', title: 'Snake.io+', subtitle: 'Apple Arcade', caption: 'Fun battle royale game', icon: iconCult, action: 'Get', route: 'game:rural-life' } },
    { rank: '6', app: { id: 'kitty-rank', title: 'Hello Kitty Island Adventure', subtitle: 'Apple Arcade', caption: 'Island adventures await', icon: iconHelloKitty, action: 'Get', route: 'game:hello-kitty' } },
    { rank: '7', app: { id: 'balatro', title: 'Balatro+', subtitle: 'Apple Arcade', caption: 'When poker meets solitaire', icon: iconDreamlight, action: 'Get', route: 'game:rural-life' } },
    { rank: '8', app: { id: 'bloons-rank', title: 'Bloons TD 6+', subtitle: 'Apple Arcade', caption: 'Mega popular tower defense', icon: iconBloons, action: 'Get', route: 'game:rural-life' } },
    { rank: '9', app: { id: 'angry-rank', title: 'Angry Birds Reloaded', subtitle: 'Apple Arcade', caption: 'Classic slingshot action', icon: iconAngryBirds, action: 'Get', route: 'game:rural-life' } },
  ]
  return items
}

export function newGames(): StoreApp[] {
  const apps: StoreApp[] = [
    { id: 'hyke', title: 'HYKE:Northern Light(s)', subtitle: 'Apple Arcade', caption: 'Role-playing', icon: iconFelicity, action: 'Get', route: 'game:rural-life' },
    { id: 'civ', title: "Sid Meier's Civilization VII", subtitle: 'Apple Arcade', caption: 'Arcade Edition', icon: iconCult, action: 'Get', route: 'game:rural-life' },
    { id: 'sago', title: "Sago Mini Jinja's Garden", subtitle: 'Apple Arcade', caption: 'A cozy gardening adventure', icon: iconCozy, action: 'Get', route: 'game:rural-life' },
    { id: 'dredge-new', title: 'DREDGE+', subtitle: 'Apple Arcade', caption: 'A sinister fishing adventure', icon: iconDredge, action: 'Get', route: 'game:dredge' },
    { id: 'door-new', title: "Felicity's Door", subtitle: 'Apple Arcade', caption: 'Music', icon: iconFelicity, action: 'Get', route: 'game:rural-life' },
    { id: 'cult-new', title: 'Cult of the Lamb', subtitle: 'Apple Arcade', caption: 'Arcade Edition', icon: iconCult, action: 'Get', route: 'game:rural-life' },
  ]
  return apps
}

export function fameGames(): StoreApp[] {
  const apps: StoreApp[] = [
    { id: 'lego', title: 'LEGO Star Wars Battles', subtitle: 'Apple Arcade', caption: 'RTS multiplayer PvP games!', icon: iconLego, action: 'Get', route: 'game:rural-life' },
    { id: 'bloons', title: 'Bloons TD 6+', subtitle: 'Apple Arcade', caption: 'Mega popular tower defense', icon: iconBloons, action: 'Get', route: 'game:rural-life' },
    { id: 'pacman', title: 'PAC-MAN Party Royale', subtitle: 'Apple Arcade', caption: 'The retro arcade multiplayer', icon: iconPacman, action: 'Get', route: 'game:rural-life' },
    { id: 'naruto', title: 'NARUTO: Ultimate Ninja Storm', subtitle: 'Apple Arcade', caption: 'Action', icon: iconNaruto, action: 'Get', route: 'game:rural-life' },
    { id: 'tmnt', title: 'TMNT Splintered Fate', subtitle: 'Apple Arcade', caption: 'Multiplayer rogue-like action', icon: iconTMNT, action: 'Get', route: 'game:rural-life' },
    { id: 'dreamlight', title: 'Disney Dreamlight Valley', subtitle: 'Apple Arcade', caption: 'Arcade Edition', icon: iconDreamlight, action: 'Get', route: 'game:rural-life' },
    { id: 'kitty-fame', title: 'Hello Kitty Island Adventure', subtitle: 'Apple Arcade', caption: 'Island adventures await', icon: iconHelloKitty, action: 'Get', route: 'game:hello-kitty' },
    { id: 'angry', title: 'Angry Birds Reloaded', subtitle: 'Apple Arcade', caption: 'Classic slingshot action', icon: iconAngryBirds, action: 'Get', route: 'game:rural-life' },
    { id: 'cooking', title: 'Cooking Mama: Cuisine!', subtitle: 'Apple Arcade', caption: 'Master the kitchen', icon: iconCooking, action: 'Get', route: 'game:rural-life' },
  ]
  return apps
}

export function arcadePerks(): Perk[] {
  const perks: Perk[] = [
    { title: 'Get a quick overview of Arcade', subtitle: 'Discover the perks of the subscription.', image: perkOverview },
    { title: 'Share with family and friends', subtitle: 'A more playful lineup for all ages.', image: perkFamily },
    { title: 'No ads or in-app purchases', subtitle: 'The cleanest way to play on Mac.', image: perkNoAds },
    { title: 'New games and more', subtitle: 'Fresh recommendations every week.', image: perkNewGames },
  ]
  return perks
}

export function categoryCards(): CategoryCard[] {
  const cards: CategoryCard[] = [
    { title: 'Strategy', image: categoryStrategyImage },
    { title: 'Family', image: categoryFamilyImage },
    { title: 'Puzzle', image: categoryPuzzleImage },
    { title: 'Simulation', image: categorySimulationImage },
  ]
  return cards
}

export function developCards(): EditorialCard[] {
  const cards: EditorialCard[] = [
    {
      eyebrow: 'GET STARTED',
      title: 'Code faster with Xcode extensions',
      subtitle: 'Enhance your coding capabilities.',
      image: developHeroImage,
      route: 'develop',
    },
    {
      eyebrow: 'DEVELOPER SPOTLIGHT',
      title: 'Get the forecast lightning fast',
      subtitle: 'Meet the couple behind Mercury Weather.',
      image: developSpotlightImage,
      route: 'develop',
    },
  ]
  return cards
}

export function playCards(): EditorialCard[] {
  const cards: EditorialCard[] = [
    {
      eyebrow: 'APPLE ARCADE',
      title: 'Can you build a lasting empire?',
      subtitle: 'A new Civilization is here.',
      image: playHeroImage,
      route: 'play',
    },
    {
      eyebrow: 'GAMES WE LOVE',
      title: 'Warp reality in Control Ultimate Edition',
      subtitle: 'Unleash psychic powers to survive the Federal Bureau.',
      image: playCardOneImage,
      route: 'play',
    },
    {
      eyebrow: "LET'S PLAY",
      title: "Don't miss these amazing games",
      subtitle: 'Download the latest and greatest on Mac.',
      image: playCardTwoImage,
      route: 'play',
    },
    {
      eyebrow: 'BEST NEW GAMES',
      title: 'Draft your destiny in Blue Prince',
      subtitle: 'Investigate a mysterious mansion by building it on the fly.',
      image: playCardThreeImage,
      route: 'play',
    },
  ]
  return cards
}

export function discoverFeatureCards(): EditorialCard[] {
  const cards: EditorialCard[] = [
    {
      eyebrow: 'GET STARTED',
      title: 'The best Safari extensions',
      subtitle: 'Enhance your browser with these apps.',
      image: developHeroImage,
      route: 'discover',
    },
    {
      eyebrow: 'GET STARTED',
      title: 'Explore Apple Creator Studio',
      subtitle: 'Powerful creativity apps and premium productivity features.',
      image: developSpotlightImage,
      route: 'discover',
    },
    {
      eyebrow: "LET'S PLAY",
      title: "Don't miss these amazing games",
      subtitle: 'Download the latest and greatest on Mac.',
      image: playCardTwoImage,
      route: 'play',
    },
  ]
  return cards
}

export function discoverLovedApps(): StoreApp[] {
  const apps: StoreApp[] = [
    { id: 'helm', title: 'Helm for App Store Connect', subtitle: 'Manage updates & beta testers', caption: 'Developer Tools', icon: iconDredge, action: 'Get', route: 'discover' },
    { id: 'dropzone', title: 'Dropzone 5', subtitle: 'Streamline Your Workflow', caption: 'Utilities', icon: iconBloons, action: 'Get', route: 'discover' },
    { id: 'craft', title: 'Craft: Notes, Documents, AI', subtitle: 'Task, Schedule & Reminder', caption: 'Productivity', icon: iconHelloKitty, action: 'Get', route: 'discover' },
    { id: 'crimson', title: 'Crimson Desert', subtitle: 'Action', caption: 'Games', icon: iconCult, action: '₹ 3,999', route: 'discover' },
    { id: 'wuthering', title: 'Wuthering Waves', subtitle: 'Waking of a World', caption: 'Games', icon: iconOceanhorn, action: 'Get', route: 'discover' },
    { id: 'return-dark', title: 'Return to Dark Castle', subtitle: 'Action', caption: 'Games', icon: iconDredge, action: '₹ 1,999', route: 'discover' },
    { id: 'prompt-three', title: 'Prompt 3', subtitle: 'The SSH app with speed & style', caption: 'Developer Tools', icon: iconDreamlight, action: 'Get', route: 'develop' },
    { id: 'tabpilot', title: 'TabPilot', subtitle: 'Quick tab search for Safari', caption: 'Utilities', icon: iconPacman, action: '₹ 399', route: 'discover' },
    { id: 'ratcheteer', title: 'Ratcheteer DX', subtitle: 'A lo-fi action-adventure', caption: 'Games', icon: iconLego, action: '₹ 1,299', route: 'discover' },
  ]
  return apps
}

export function discoverLatestGames(): EditorialCard[] {
  const cards: EditorialCard[] = [
    {
      eyebrow: 'GAMES WE LOVE',
      title: 'Draft your destiny in Blue Prince',
      subtitle: 'Investigate a mysterious mansion by building it on the fly.',
      image: playCardThreeImage,
      route: 'play',
    },
    {
      eyebrow: 'NEW GAME',
      title: "Beat the king in Let's! Revolution!",
      subtitle: 'Fight hidden foes on dangerous roads.',
      image: playCardOneImage,
      route: 'play',
    },
    {
      eyebrow: 'WORLD PREMIERE',
      title: 'Embark on a Bluey Adventure',
      subtitle: 'Can you track down the elusive gold pen?',
      image: playCardTwoImage,
      route: 'play',
    },
  ]
  return cards
}

export function developerApps(): StoreApp[] {
  const apps: StoreApp[] = [
    { id: 'bbedit', title: 'BBEdit', subtitle: 'Legendary text and code editor', caption: 'Developer Tools', icon: iconDredge, action: 'Get', route: 'develop' },
    { id: 'testflight', title: 'TestFlight', subtitle: 'Beta testing made simple', caption: 'Developer Tools', icon: iconBloons, action: 'Cloud', route: 'develop' },
    { id: 'prompt', title: 'Prompt 3', subtitle: 'The SSH app with speed and style', caption: 'Developer Tools', icon: iconDreamlight, action: 'Get', route: 'develop' },
    { id: 'developer', title: 'Apple Developer', subtitle: 'Developer Tools', caption: 'Certificates and docs', icon: iconOceanhorn, action: 'Cloud', route: 'develop' },
    { id: 'xcode', title: 'Xcode', subtitle: 'Developer Tools', caption: 'Build and ship on Apple platforms', icon: iconPacman, action: 'Update', route: 'develop' },
    { id: 'snippet', title: 'Snippit', subtitle: 'AI snippets manager', caption: 'Your code, everywhere.', icon: iconCooking, action: 'Get', route: 'develop' },
  ]
  return apps
}

export function gameFromRoute(route: string): GameDetail {
  if (route === 'game:dredge') return dredge
  if (route === 'game:hello-kitty') return helloKitty
  return ruralLife
}
