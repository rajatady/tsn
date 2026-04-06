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
    <Card className="rounded-2xl p-0 bg-zinc-800">
      <VStack className="gap-0">
        <Image src="examples/native-gui/app-store/assets/develop-spotlight.png" className="h-[420] rounded-2xl object-cover" />
        <VStack className="gap-1 px-5 py-4">
          <Text className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Try Something New</Text>
          <Text className="text-3xl font-bold tracking-tight leading-tight">Indispensable affordable apps</Text>
          <Text className="text-sm text-zinc-400">Simple but super-useful apps that won't break the bank.</Text>
        </VStack>
      </VStack>
    </Card>
  )
}

function FeatureCard(eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <Card className="flex-1 rounded-2xl p-0 bg-zinc-800">
      <VStack className="gap-0">
        <Image src={image} className="h-[200] rounded-2xl object-cover" />
        <VStack className="gap-1 px-4 py-3">
          <Text className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">{eyebrow}</Text>
          <Text className="text-lg font-bold leading-tight">{title}</Text>
          <Text className="text-sm text-zinc-400">{subtitle}</Text>
        </VStack>
      </VStack>
    </Card>
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
    <HStack className="gap-8">
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

function GameCard(eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <VStack className="flex-1 gap-0">
      <Image src={image} className="h-[200] rounded-2xl object-cover" />
      <VStack className="gap-1 py-3">
        <Text className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">{eyebrow}</Text>
        <Text className="text-lg font-bold leading-tight">{title}</Text>
        <Text className="text-sm text-zinc-400">{subtitle}</Text>
      </VStack>
    </VStack>
  )
}

function LatestGamesGrid() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <HStack className="gap-4">
      {GameCard(cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
      {GameCard(cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
      {GameCard(cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
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
