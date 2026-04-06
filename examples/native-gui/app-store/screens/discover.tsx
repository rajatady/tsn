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
    <Card className="rounded-2xl bg-zinc-800 shadow-lg">
      <VStack className="gap-0">
        <Image src="examples/native-gui/app-store/assets/develop-spotlight.png" className="h-[380] rounded-2xl object-cover" />
        <VStack className="gap-1 p-5">
          <Text className="text-xs text-zinc-400 uppercase tracking-wide">Try Something New</Text>
          <Text className="text-3xl font-bold tracking-tight leading-tight">Indispensable affordable apps</Text>
          <Text className="text-sm text-zinc-400">Simple but super-useful apps that won't break the bank.</Text>
        </VStack>
      </VStack>
    </Card>
  )
}

function DiscoverFeatureRail() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <HStack className="gap-4">
      <Card className="flex-1 rounded-2xl bg-zinc-800 shadow-lg">
        <HStack className="items-center gap-5 p-5">
          <VStack className="flex-1 gap-1">
            <Text className="text-xs text-zinc-400 uppercase tracking-wide">{cards[0].eyebrow}</Text>
            <Text className="text-xl font-bold leading-tight">{cards[0].title}</Text>
            <Text className="text-sm text-zinc-400">{cards[0].subtitle}</Text>
          </VStack>
          <Image src={cards[0].image} className="w-[100] h-[100] rounded-full object-cover" />
        </HStack>
      </Card>
      <Card className="flex-1 rounded-2xl bg-zinc-800 shadow-lg">
        <HStack className="items-center gap-5 p-5">
          <VStack className="flex-1 gap-1">
            <Text className="text-xs text-zinc-400 uppercase tracking-wide">{cards[1].eyebrow}</Text>
            <Text className="text-xl font-bold leading-tight">{cards[1].title}</Text>
            <Text className="text-sm text-zinc-400">{cards[1].subtitle}</Text>
          </VStack>
          <Image src={cards[1].image} className="w-[100] h-[100] rounded-full object-cover" />
        </HStack>
      </Card>
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

function LatestGamesGrid() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <HStack className="gap-4">
      <VStack className="flex-1 gap-2">
        <Image src={cards[0].image} className="h-[200] rounded-2xl object-cover" />
        <Text className="text-xs text-zinc-400 uppercase tracking-wide">{cards[0].eyebrow}</Text>
        <Text className="text-xl font-bold leading-tight">{cards[0].title}</Text>
        <Text className="text-sm text-zinc-400">{cards[0].subtitle}</Text>
      </VStack>
      <VStack className="flex-1 gap-2">
        <Image src={cards[1].image} className="h-[200] rounded-2xl object-cover" />
        <Text className="text-xs text-zinc-400 uppercase tracking-wide">{cards[1].eyebrow}</Text>
        <Text className="text-xl font-bold leading-tight">{cards[1].title}</Text>
        <Text className="text-sm text-zinc-400">{cards[1].subtitle}</Text>
      </VStack>
      <VStack className="flex-1 gap-2">
        <Image src={cards[2].image} className="h-[200] rounded-2xl object-cover" />
        <Text className="text-xs text-zinc-400 uppercase tracking-wide">{cards[2].eyebrow}</Text>
        <Text className="text-xl font-bold leading-tight">{cards[2].title}</Text>
        <Text className="text-sm text-zinc-400">{cards[2].subtitle}</Text>
      </VStack>
    </HStack>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0">
        <VStack className="gap-7 px-8 py-7">
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
