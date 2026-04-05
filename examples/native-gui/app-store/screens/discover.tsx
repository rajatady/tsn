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
    <Card className="rounded-2xl bg-zinc-800">
      <HStack className="gap-7 p-6">
        <VStack className="max-w-[280] gap-2">
          <Text className="text-xs text-zinc-400">TRY SOMETHING NEW</Text>
          <Text className="text-4xl font-bold">Indispensable affordable apps</Text>
          <Text className="text-base text-zinc-400">Simple but super-useful apps that won't break the bank.</Text>
        </VStack>
        <Spacer />
        <Image src="examples/native-gui/app-store/assets/develop-spotlight.png" className="w-[610] h-[296] rounded-2xl" />
      </HStack>
    </Card>
  )
}

function DiscoverFeatureRail() {
  const cards: EditorialCard[] = discoverFeatureCards()

  return (
    <Scroll className="h-[210] overflow-x-auto">
      <HStack className="gap-4">
        <Card className="w-[470] rounded-2xl bg-zinc-800">
          <HStack className="gap-5 p-5">
            <VStack className="max-w-[230] gap-2">
              <Text className="text-xs text-zinc-400">{cards[0].eyebrow}</Text>
              <Text className="text-3xl font-bold">{cards[0].title}</Text>
              <Text className="text-base text-zinc-400">{cards[0].subtitle}</Text>
            </VStack>
            <Spacer />
            <Image src={cards[0].image} className="w-[120] h-[120] rounded-full" />
          </HStack>
        </Card>
        <Card className="w-[470] rounded-2xl bg-zinc-800">
          <HStack className="gap-5 p-5">
            <VStack className="max-w-[230] gap-2">
              <Text className="text-xs text-zinc-400">{cards[1].eyebrow}</Text>
              <Text className="text-3xl font-bold">{cards[1].title}</Text>
              <Text className="text-base text-zinc-400">{cards[1].subtitle}</Text>
            </VStack>
            <Spacer />
            <Image src={cards[1].image} className="w-[120] h-[120] rounded-full" />
          </HStack>
        </Card>
        <Card className="w-[470] rounded-2xl bg-zinc-800">
          <HStack className="gap-5 p-5">
            <VStack className="max-w-[230] gap-2">
              <Text className="text-xs text-zinc-400">{cards[2].eyebrow}</Text>
              <Text className="text-3xl font-bold">{cards[2].title}</Text>
              <Text className="text-base text-zinc-400">{cards[2].subtitle}</Text>
            </VStack>
            <Spacer />
            <Image src={cards[2].image} className="w-[120] h-[120] rounded-full" />
          </HStack>
        </Card>
      </HStack>
    </Scroll>
  )
}

function LovedAppsRail() {
  const apps: StoreApp[] = discoverLovedApps()

  return (
    <Scroll className="h-[238] overflow-x-auto">
      <HStack className="gap-8">
        <VStack className="w-[350] gap-0">
          <AppRow app={apps[0]} />
          <Divider />
          <AppRow app={apps[3]} />
          <Divider />
          <AppRow app={apps[6]} />
        </VStack>
        <VStack className="w-[350] gap-0">
          <AppRow app={apps[1]} />
          <Divider />
          <AppRow app={apps[4]} />
          <Divider />
          <AppRow app={apps[7]} />
        </VStack>
        <VStack className="w-[350] gap-0">
          <AppRow app={apps[2]} />
          <Divider />
          <AppRow app={apps[5]} />
          <Divider />
          <AppRow app={apps[8]} />
        </VStack>
      </HStack>
    </Scroll>
  )
}

function LatestGamesRail() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <Scroll className="h-[308] overflow-x-auto">
      <HStack className="gap-4">
        <VStack className="w-[356] gap-2">
          <Image src={cards[0].image} className="w-[356] h-[200] rounded-2xl" />
          <Text className="text-xs text-zinc-400">{cards[0].eyebrow}</Text>
          <Text className="text-2xl font-bold">{cards[0].title}</Text>
          <Text className="text-base text-zinc-400">{cards[0].subtitle}</Text>
        </VStack>
        <VStack className="w-[356] gap-2">
          <Image src={cards[1].image} className="w-[356] h-[200] rounded-2xl" />
          <Text className="text-xs text-zinc-400">{cards[1].eyebrow}</Text>
          <Text className="text-2xl font-bold">{cards[1].title}</Text>
          <Text className="text-base text-zinc-400">{cards[1].subtitle}</Text>
        </VStack>
        <VStack className="w-[356] gap-2">
          <Image src={cards[2].image} className="w-[356] h-[200] rounded-2xl" />
          <Text className="text-xs text-zinc-400">{cards[2].eyebrow}</Text>
          <Text className="text-2xl font-bold">{cards[2].title}</Text>
          <Text className="text-base text-zinc-400">{cards[2].subtitle}</Text>
        </VStack>
      </HStack>
    </Scroll>
  )
}

export function DiscoverScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0">
        <VStack className="max-w-[1160] mx-auto gap-7 px-8 py-7">
          <Text className="text-5xl font-bold">Discover</Text>
          <DiscoverHero />
          <DiscoverFeatureRail />
          <SectionHeader title="Apps and Games We Love Right Now" action="See All" route="discover" />
          <LovedAppsRail />
          <SectionHeader title="The Latest Must-Play Mac Games" action="See All" route="play" />
          <LatestGamesRail />
        </VStack>
      </VStack>
    </Scroll>
  )
}
