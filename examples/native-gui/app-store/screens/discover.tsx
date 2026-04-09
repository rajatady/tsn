import { AppRow } from '../components'
import {
  discoverFeatureCards,
  discoverHeroCards,
  discoverLatestGames,
  discoverLovedApps,
  type EditorialCard,
  type StoreApp,
} from '../data'

function HeroFeature() {
  const heroes: EditorialCard[] = discoverHeroCards()
  const hero: EditorialCard = heroes[0]

  return (
    <ZStack testId="hero" className="w-full aspect-[22/10] rounded-2xl overflow-hidden mb-6">
      <Image testId="hero-img" src={hero.image} className="w-full h-full object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack className="justify-end p-8">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-[0.15em] mb-1 truncate">{hero.eyebrow}</Text>
        <Text className="text-[34] font-bold leading-tight tracking-tight mb-1 truncate">{hero.title}</Text>
        <Text className="text-[15] text-white/55 max-w-[448px]">{hero.subtitle}</Text>
      </VStack>
    </ZStack>
  )
}

function FeatureCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const eid: string = 'editorial-' + idx

  return (
    <VStack testId={eid} className="flex-1 min-w-0 gap-0">
      <VStack className="rounded-xl overflow-hidden mb-2">
        <Image testId={eid + '-img'} src={image} className="w-full aspect-[16/10] object-cover" />
      </VStack>
      <Text testId={eid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-[0.12em] truncate">{eyebrow}</Text>
      <Text testId={eid + '-title'} className="text-[15] font-semibold mt-[2px] truncate">{title}</Text>
      <Text testId={eid + '-subtitle'} className="text-[13] text-white/40 mt-[2px] truncate">{subtitle}</Text>
    </VStack>
  )
}

function EditorialRow() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <HStack testId="editorial-row" className="gap-4 mb-10">
      {FeatureCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {FeatureCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {FeatureCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
    </HStack>
  )
}

function LovedAppsGrid() {
  const apps: StoreApp[] = discoverLovedApps()
  const divider: JSX.Element = <VStack className="h-[1] bg-white/[0.04]" />

  return (
    <HStack testId="app-grid" className="gap-0">
      <VStack testId="app-col-0" className="flex-1 gap-0">
        <AppRow app={apps[0]} testId="app-0-0" actionLabel="View" />
        {divider}
        <AppRow app={apps[3]} testId="app-0-1" actionLabel="View" />
        {divider}
        <AppRow app={apps[6]} testId="app-0-2" actionLabel="View" />
      </VStack>
      <VStack testId="app-col-1" className="flex-1 gap-0">
        <AppRow app={apps[1]} testId="app-1-0" actionLabel="View" />
        {divider}
        <AppRow app={apps[4]} testId="app-1-1" actionLabel="View" />
        {divider}
        <AppRow app={apps[7]} testId="app-1-2" actionLabel="View" />
      </VStack>
      <VStack testId="app-col-2" className="flex-1 gap-0">
        <AppRow app={apps[2]} testId="app-2-0" actionLabel="View" />
        {divider}
        <AppRow app={apps[5]} testId="app-2-1" actionLabel="View" />
        {divider}
        <AppRow app={apps[8]} testId="app-2-2" actionLabel="View" />
      </VStack>
    </HStack>
  )
}

function GameCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const gid: string = 'game-' + idx

  return (
    <VStack testId={gid} className="flex-1 min-w-0 gap-0">
      <VStack className="rounded-xl overflow-hidden mb-2">
        <Image testId={gid + '-img'} src={image} className="w-full aspect-[16/10] object-cover" />
      </VStack>
      <Text testId={gid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-[0.12em] truncate">{eyebrow}</Text>
      <Text testId={gid + '-title'} className="text-[15] font-semibold mt-[2px] truncate">{title}</Text>
      <Text testId={gid + '-subtitle'} className="text-[13] text-white/40 mt-[2px] truncate">{subtitle}</Text>
    </VStack>
  )
}

function GamesRow() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <HStack testId="games-row" className="gap-4">
      {GameCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {GameCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {GameCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
    </HStack>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll testId="content" className="flex-1 overflow-y-auto bg-[#161617]">
      <VStack className="gap-0 px-8 pt-5 pb-12">
        <Text testId="page-title" className="text-[32] font-bold leading-normal tracking-tight mb-5">Discover</Text>
        <HeroFeature />
        <EditorialRow />
        <HStack testId="section-apps" className="items-center gap-[6px] mb-4">
          <Text testId="section-apps-title" className="text-[22] font-bold leading-normal tracking-tight">Apps and Games We Love Right Now</Text>
        </HStack>
        <VStack className="mb-10">
          <LovedAppsGrid />
        </VStack>
        <Text testId="section-games-title" className="text-[22] font-bold leading-normal tracking-tight mb-4">The Latest Must-Play Mac Games</Text>
        <GamesRow />
      </VStack>
    </Scroll>
  )
}
