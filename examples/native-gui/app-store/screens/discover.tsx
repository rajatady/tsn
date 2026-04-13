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
  const hero: EditorialCard = discoverHeroCards()[0]

  return (
    <ZStack testId="hero" className="w-full aspect-[10/13] md:aspect-[22/10] rounded-[24px] overflow-hidden mb-6 md:mb-8">
      <Image testId="hero-img" src={hero.image} className="w-full h-full object-cover" />
      <Gradient from="black/65" to="transparent" direction="to-top" />
      <VStack className="justify-end p-5 md:p-8">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-[0.15em] mb-1 truncate">{hero.eyebrow}</Text>
        <Text className="text-[28] font-bold leading-tight tracking-tight mb-1 truncate">{hero.title}</Text>
        <Text className="text-[15] text-white/55">{hero.subtitle}</Text>
      </VStack>
    </ZStack>
  )
}

function FeatureCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const eid: string = 'editorial-' + idx

  return (
    <VStack testId={eid} className="w-[248] md:w-[320] min-w-[248] md:min-w-[320] gap-0">
      <VStack className="rounded-xl overflow-hidden mb-2">
        <Image testId={eid + '-img'} src={image} className="w-full aspect-[16/10] object-cover" />
      </VStack>
      <Text testId={eid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-[0.12em] truncate">{eyebrow}</Text>
      <Text testId={eid + '-title'} className="text-[15] font-semibold mt-[2px] truncate">{title}</Text>
      <Text testId={eid + '-subtitle'} className="text-[13] text-white/40 mt-[2px]">{subtitle}</Text>
    </VStack>
  )
}

function EditorialRow() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <Scroll testId="editorial-row" className="overflow-x-auto mb-8 md:mb-10">
      <HStack className="gap-4">
        {FeatureCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {FeatureCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {FeatureCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
      </HStack>
    </Scroll>
  )
}

function LovedAppsList() {
  const apps: StoreApp[] = discoverLovedApps()

  return (
    <VStack testId="app-grid" className="gap-0 mb-8 md:mb-10">
      <AppRow app={apps[0]} testId="app-0-0" actionLabel="View" />
      <Divider />
      <AppRow app={apps[1]} testId="app-1-0" actionLabel="View" />
      <Divider />
      <AppRow app={apps[2]} testId="app-2-0" actionLabel="View" />
      <Divider />
      <AppRow app={apps[3]} testId="app-0-1" actionLabel="View" />
      <Divider />
      <AppRow app={apps[4]} testId="app-1-1" actionLabel="View" />
      <Divider />
      <AppRow app={apps[5]} testId="app-2-1" actionLabel="View" />
    </VStack>
  )
}

function GameCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const gid: string = 'game-' + idx

  return (
    <VStack testId={gid} className="w-[248] md:w-[320] min-w-[248] md:min-w-[320] gap-0">
      <VStack className="rounded-xl overflow-hidden mb-2">
        <Image testId={gid + '-img'} src={image} className="w-full aspect-[16/10] object-cover" />
      </VStack>
      <Text testId={gid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-[0.12em] truncate">{eyebrow}</Text>
      <Text testId={gid + '-title'} className="text-[15] font-semibold mt-[2px] truncate">{title}</Text>
      <Text testId={gid + '-subtitle'} className="text-[13] text-white/40 mt-[2px]">{subtitle}</Text>
    </VStack>
  )
}

function GamesRow() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <Scroll testId="games-row" className="overflow-x-auto">
      <HStack className="gap-4">
        {GameCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {GameCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {GameCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
      </HStack>
    </Scroll>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll testId="content" className="flex-1 overflow-y-auto bg-[#161617]">
      <VStack className="gap-0 px-5 md:px-8 pt-5 pb-10 md:pb-12">
        <Text testId="page-title" className="text-[20] font-bold leading-normal tracking-tight mb-4 md:mb-5">Discover</Text>
        <HeroFeature />
        <Text className="text-[18] font-bold tracking-tight mb-3">Stories We Love</Text>
        <EditorialRow />
        <Text testId="section-apps-title" className="text-[18] font-bold leading-normal tracking-tight mb-3">Apps and Games We Love Right Now</Text>
        <LovedAppsList />
        <Text testId="section-games-title" className="text-[18] font-bold leading-normal tracking-tight mb-3">The Latest Must-Play Games</Text>
        <GamesRow />
      </VStack>
    </Scroll>
  )
}
