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
    <ZStack className="rounded-2xl overflow-hidden">
      <Image src="examples/native-gui/app-store/assets/rural-hero.png" className="h-[420] object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack className="justify-end p-8 gap-1">
        <Text className="text-xs text-white/50 uppercase tracking-wide font-semibold">Games We Love</Text>
        <Text className="text-4xl font-bold tracking-tight leading-tight">Rural Life Village</Text>
        <Text className="text-sm text-white/55">Farm, craft, and explore a peaceful countryside — in this charming adventure.</Text>
      </VStack>
    </ZStack>
  )
}

function FeatureCard(eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <VStack className="flex-1 gap-0">
      <Card className="rounded-xl p-0 overflow-hidden">
        <Image src={image} className="h-[200] object-cover" />
      </Card>
      <VStack className="gap-1 py-2">
        <Text className="text-xs text-white/25 uppercase tracking-wide font-semibold">{eyebrow}</Text>
        <Text className="text-base font-semibold leading-tight">{title}</Text>
        <Text className="text-sm text-white/40">{subtitle}</Text>
      </VStack>
    </VStack>
  )
}

function DiscoverFeatureRail() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <HStack className="gap-4">
      {FeatureCard(cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {FeatureCard(cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {FeatureCard(cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
    </HStack>
  )
}

function LovedAppsGrid() {
  const apps: StoreApp[] = discoverLovedApps()

  return (
    <HStack className="gap-0">
      <VStack className="flex-1 gap-0">
        <AppRow app={apps[0]} />
        <Divider />
        <AppRow app={apps[3]} />
        <Divider />
        <AppRow app={apps[6]} />
      </VStack>
      <VStack className="flex-1 gap-0">
        <AppRow app={apps[1]} />
        <Divider />
        <AppRow app={apps[4]} />
        <Divider />
        <AppRow app={apps[7]} />
      </VStack>
      <VStack className="flex-1 gap-0">
        <AppRow app={apps[2]} />
        <Divider />
        <AppRow app={apps[5]} />
        <Divider />
        <AppRow app={apps[8]} />
      </VStack>
    </HStack>
  )
}

function GameEditorialCard(eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <VStack className="flex-1 gap-0">
      <Card className="rounded-xl p-0 overflow-hidden">
        <Image src={image} className="h-[200] object-cover" />
      </Card>
      <VStack className="gap-1 py-2">
        <Text className="text-xs text-white/25 uppercase tracking-wide font-semibold">{eyebrow}</Text>
        <Text className="text-base font-semibold leading-tight">{title}</Text>
        <Text className="text-sm text-white/40">{subtitle}</Text>
      </VStack>
    </VStack>
  )
}

function LatestGamesGrid() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <HStack className="gap-4">
      {GameEditorialCard(cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {GameEditorialCard(cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {GameEditorialCard(cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
    </HStack>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0">
        <VStack className="gap-6 px-8 py-6">
          <Text className="text-4xl font-bold tracking-tight">Discover</Text>
          <DiscoverHero />
          <DiscoverFeatureRail />
          <SectionHeader title="Apps and Games We Love Right Now" action="See All" route="discover" />
          <LovedAppsGrid />
          <SectionHeader title="The Latest Must-Play Mac Games" action="See All" route="play" />
          <LatestGamesGrid />
        </VStack>
      </VStack>
    </Scroll>
  )
}
