import {
  AppRow,
  SectionHeader,
} from '../components'
import {
  discoverFeatureCards,
  discoverLatestGames,
  discoverLovedApps,
  type EditorialCard,
  type StoreApp,
} from '../data'

function DiscoverHero() {
  return (
    <ZStack testId="hero" className="rounded-2xl overflow-hidden">
      <Image testId="hero-img" src="examples/native-gui/app-store/assets/rural-hero.png" className="aspect-[22/10] object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack testId="hero-text" className="justify-end p-8 gap-1">
        <Text testId="hero-eyebrow" className="text-[11] font-bold text-white/50 uppercase tracking-wide">Games We Love</Text>
        <Text testId="hero-title" className="text-[34] font-bold leading-tight tracking-tight">Rural Life Village</Text>
        <Text testId="hero-subtitle" className="text-[15] text-white/55">Farm, craft, and explore a peaceful countryside — in this charming adventure.</Text>
      </VStack>
    </ZStack>
  )
}

function DiscoverEditorialCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const eid: string = 'editorial-' + idx

  return (
    <VStack testId={eid} className="flex-1 gap-0">
      <Card className="rounded-xl p-0 overflow-hidden">
        <Image testId={eid + '-img'} src={image} className="aspect-[16/10] object-cover" />
      </Card>
      <VStack className="gap-1 py-2">
        <Text testId={eid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-wide">{eyebrow}</Text>
        <Text testId={eid + '-title'} className="text-[15] font-semibold">{title}</Text>
        <Text testId={eid + '-subtitle'} className="text-[13] text-white/40">{subtitle}</Text>
      </VStack>
    </VStack>
  )
}

function DiscoverFeatureRail() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <HStack testId="editorial-row" className="gap-4">
      {DiscoverEditorialCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {DiscoverEditorialCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {DiscoverEditorialCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
    </HStack>
  )
}

function LovedAppsGrid() {
  const apps: StoreApp[] = discoverLovedApps()

  return (
    <HStack testId="app-grid" className="gap-0">
      <VStack testId="app-col-0" className="flex-1 gap-0">
        <AppRow app={apps[0]} />
        <Divider />
        <AppRow app={apps[3]} />
        <Divider />
        <AppRow app={apps[6]} />
      </VStack>
      <VStack testId="app-col-1" className="flex-1 gap-0">
        <AppRow app={apps[1]} />
        <Divider />
        <AppRow app={apps[4]} />
        <Divider />
        <AppRow app={apps[7]} />
      </VStack>
      <VStack testId="app-col-2" className="flex-1 gap-0">
        <AppRow app={apps[2]} />
        <Divider />
        <AppRow app={apps[5]} />
        <Divider />
        <AppRow app={apps[8]} />
      </VStack>
    </HStack>
  )
}

function DiscoverGameCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const gid: string = 'game-' + idx

  return (
    <VStack testId={gid} className="flex-1 gap-0">
      <Card className="rounded-xl p-0 overflow-hidden">
        <Image testId={gid + '-img'} src={image} className="aspect-[16/10] object-cover" />
      </Card>
      <VStack className="gap-1 py-2">
        <Text testId={gid + '-eyebrow'} className="text-[11] font-semibold text-white/25 uppercase tracking-wide">{eyebrow}</Text>
        <Text testId={gid + '-title'} className="text-[15] font-semibold">{title}</Text>
        <Text testId={gid + '-subtitle'} className="text-[13] text-white/40">{subtitle}</Text>
      </VStack>
    </VStack>
  )
}

function LatestGamesGrid() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <HStack testId="games-row" className="gap-4">
      {DiscoverGameCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {DiscoverGameCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {DiscoverGameCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
    </HStack>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll testId="content" className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-8 py-5">
        <Text testId="page-title" className="text-[32] font-bold tracking-tight mb-5">Discover</Text>
        <DiscoverHero />
        <VStack className="h-[24]" />
        <DiscoverFeatureRail />
        <VStack className="h-[40]" />
        <HStack testId="section-apps" className="items-center gap-2 mb-4">
          <Text testId="section-apps-title" className="text-[22] font-bold tracking-tight">Apps and Games We Love Right Now</Text>
        </HStack>
        <LovedAppsGrid />
        <VStack className="h-[40]" />
        <Text testId="section-games-title" className="text-[22] font-bold tracking-tight mb-4">The Latest Must-Play Mac Games</Text>
        <LatestGamesGrid />
      </VStack>
    </Scroll>
  )
}
