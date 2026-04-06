import {
  AppRow,
  SectionHeader,
} from '../components'
import {
  discoverFeatureCards,
  discoverHeroCards,
  discoverLatestGames,
  discoverLovedApps,
  type EditorialCard,
  type StoreApp,
} from '../data'

function HeroCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const hid: string = 'hero-' + idx

  return (
    <ZStack testId={hid} className="w-[1096] rounded-2xl overflow-hidden">
      <Image testId={hid + '-img'} src={image} className="aspect-[22/10] object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack className="justify-end p-8 gap-1">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-wide truncate">{eyebrow}</Text>
        <Text className="text-[34] font-bold leading-tight tracking-tight truncate">{title}</Text>
        <Text className="text-[15] text-white/55 truncate">{subtitle}</Text>
      </VStack>
    </ZStack>
  )
}

function HeroCarousel() {
  const heroes: EditorialCard[] = discoverHeroCards()

  return (
    <Scroll testId="hero-carousel" className="overflow-x-auto rounded-2xl">
      <HStack className="gap-4">
        {HeroCard(0, heroes[0].eyebrow, heroes[0].title, heroes[0].subtitle, heroes[0].image)}
        {HeroCard(1, heroes[1].eyebrow, heroes[1].title, heroes[1].subtitle, heroes[1].image)}
        {HeroCard(2, heroes[2].eyebrow, heroes[2].title, heroes[2].subtitle, heroes[2].image)}
      </HStack>
    </Scroll>
  )
}

function FeatureCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const eid: string = 'editorial-' + idx

  return (
    <VStack testId={eid} className="w-[340] gap-0">
      <Image testId={eid + '-img'} src={image} className="rounded-xl aspect-[16/10] object-cover" />
      <VStack className="h-[8]" />
      <Text testId={eid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-wide truncate">{eyebrow}</Text>
      <VStack className="h-[2]" />
      <Text testId={eid + '-title'} className="text-[15] font-semibold truncate">{title}</Text>
      <VStack className="h-[2]" />
      <Text testId={eid + '-subtitle'} className="text-[13] text-white/40 truncate">{subtitle}</Text>
    </VStack>
  )
}

function EditorialCarousel() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <Scroll testId="editorial-carousel" className="overflow-x-auto">
      <HStack testId="editorial-row" className="gap-4">
        {FeatureCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {FeatureCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {FeatureCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
        {FeatureCard(3, cards[3].eyebrow, cards[3].title, cards[3].subtitle, cards[3].image)}
        {FeatureCard(4, cards[4].eyebrow, cards[4].title, cards[4].subtitle, cards[4].image)}
      </HStack>
    </Scroll>
  )
}

function LovedAppsGrid() {
  const apps: StoreApp[] = discoverLovedApps()

  return (
    <HStack testId="app-grid" className="gap-0">
      <VStack testId="app-col-0" className="flex-1 gap-0">
        <AppRow app={apps[0]} testId="app-0-0" />
        <Divider />
        <AppRow app={apps[3]} testId="app-0-1" />
        <Divider />
        <AppRow app={apps[6]} testId="app-0-2" />
      </VStack>
      <VStack testId="app-col-1" className="flex-1 gap-0">
        <AppRow app={apps[1]} testId="app-1-0" />
        <Divider />
        <AppRow app={apps[4]} testId="app-1-1" />
        <Divider />
        <AppRow app={apps[7]} testId="app-1-2" />
      </VStack>
      <VStack testId="app-col-2" className="flex-1 gap-0">
        <AppRow app={apps[2]} testId="app-2-0" />
        <Divider />
        <AppRow app={apps[5]} testId="app-2-1" />
        <Divider />
        <AppRow app={apps[8]} testId="app-2-2" />
      </VStack>
    </HStack>
  )
}

function GameCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const gid: string = 'game-' + idx

  return (
    <VStack testId={gid} className="w-[340] gap-0">
      <Image testId={gid + '-img'} src={image} className="rounded-xl aspect-[16/10] object-cover" />
      <VStack className="h-[8]" />
      <Text testId={gid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-wide truncate">{eyebrow}</Text>
      <VStack className="h-[2]" />
      <Text testId={gid + '-title'} className="text-[15] font-semibold truncate">{title}</Text>
      <VStack className="h-[2]" />
      <Text testId={gid + '-subtitle'} className="text-[13] text-white/40 truncate">{subtitle}</Text>
    </VStack>
  )
}

function GamesCarousel() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <Scroll testId="games-carousel" className="overflow-x-auto">
      <HStack testId="games-row" className="gap-4">
        {GameCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {GameCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {GameCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
        {GameCard(3, cards[3].eyebrow, cards[3].title, cards[3].subtitle, cards[3].image)}
        {GameCard(4, cards[4].eyebrow, cards[4].title, cards[4].subtitle, cards[4].image)}
      </HStack>
    </Scroll>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll testId="content" className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-8 py-5">
        <Text testId="page-title" className="text-[32] font-bold tracking-tight">Discover</Text>
        <VStack className="h-[20]" />
        <HeroCarousel />
        <VStack className="h-[24]" />
        <EditorialCarousel />
        <VStack className="h-[40]" />
        <HStack testId="section-apps" className="items-center gap-2">
          <Text testId="section-apps-title" className="text-[22] font-bold tracking-tight">Apps and Games We Love Right Now</Text>
        </HStack>
        <VStack className="h-[16]" />
        <LovedAppsGrid />
        <VStack className="h-[40]" />
        <Text testId="section-games-title" className="text-[22] font-bold tracking-tight">The Latest Must-Play Mac Games</Text>
        <VStack className="h-[16]" />
        <GamesCarousel />
      </VStack>
    </Scroll>
  )
}
