import { useRoute } from '../../framework/react'
import { arcadeHeroImage } from '../assets'
import {
  AppRow,
  CategoryTile,
  NativeHud,
  PerkCardView,
  RankedAppRow,
  SectionHeader,
} from '../components'
import {
  arcadeChipList,
  arcadePerks,
  categoryCards,
  fameGames,
  newGames,
  topArcadeGames,
  topStripApps,
  type CategoryCard,
  type Perk,
  type RankedApp,
  type StoreApp,
} from '../data'

function TopRail() {
  const [currentRoute, navigate] = useRoute('arcade')

  return (
    <HStack className="gap-3">
      <Text className="text-xl font-bold">Apple Arcade</Text>
      <Text className="text-sm text-zinc-400">1 month free, then Rs. 99.00/month.</Text>
      <Spacer />
      <Text className="text-base font-bold">Arcade</Text>
      <Spacer />
      <Button variant="primary" onClick={() => navigate('game:rural-life')}>Accept Offer</Button>
    </HStack>
  )
}

function Hero() {
  const [currentRoute, navigate] = useRoute('arcade')

  return (
    <Card className="rounded-xl">
      <VStack className="gap-4">
        <Image src={arcadeHeroImage} className="w-[1110] h-[490] rounded-xl" />
        <VStack className="gap-1">
          <Text className="text-xs text-zinc-400">Apple Arcade</Text>
          <Text className="text-4xl font-bold">No In-App Purchases. No Ads. Just Fun.</Text>
          <Text className="text-sm text-zinc-400">A native AppKit storefront rebuilt to match the App Store cadence instead of wrapping screenshots.</Text>
        </VStack>
        <HStack className="gap-3">
          <Button variant="primary" onClick={() => navigate('game:rural-life')}>Accept Offer</Button>
          <Text className="text-sm text-zinc-400">1 month free, then Rs. 99.00/month.</Text>
        </HStack>
      </VStack>
    </Card>
  )
}

function ChipRow() {
  const chips: string[] = arcadeChipList()

  return (
    <HStack className="gap-2">
      {chips.map(chip => {
        if (chip === 'All Games') {
          return <Button variant="primary">{chip}</Button>
        }
        return <Button variant="chip">{chip}</Button>
      })}
    </HStack>
  )
}

function TopStrip() {
  const apps: StoreApp[] = topStripApps()

  return (
    <HStack className="gap-8">
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[0]} />
        <AppRow app={apps[3]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[1]} />
        <AppRow app={apps[4]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[2]} />
        <AppRow app={apps[5]} />
      </VStack>
    </HStack>
  )
}

function TopCharts() {
  const items: RankedApp[] = topArcadeGames()

  return (
    <HStack className="gap-8">
      <VStack className="flex-1 gap-4">
        <RankedAppRow item={items[0]} />
        <RankedAppRow item={items[1]} />
        <RankedAppRow item={items[2]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <RankedAppRow item={items[3]} />
        <RankedAppRow item={items[4]} />
        <RankedAppRow item={items[5]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <RankedAppRow item={items[6]} />
        <RankedAppRow item={items[7]} />
        <RankedAppRow item={items[8]} />
      </VStack>
    </HStack>
  )
}

function FameShelf() {
  const apps: StoreApp[] = fameGames()

  return (
    <HStack className="gap-8">
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[0]} />
        <AppRow app={apps[3]} />
        <AppRow app={apps[6]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[1]} />
        <AppRow app={apps[4]} />
        <AppRow app={apps[7]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[2]} />
        <AppRow app={apps[5]} />
        <AppRow app={apps[8]} />
      </VStack>
    </HStack>
  )
}

function NewGamesShelf() {
  const apps: StoreApp[] = newGames()

  return (
    <HStack className="gap-8">
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[0]} />
        <AppRow app={apps[3]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[1]} />
        <AppRow app={apps[4]} />
      </VStack>
      <VStack className="flex-1 gap-4">
        <AppRow app={apps[2]} />
        <AppRow app={apps[5]} />
      </VStack>
    </HStack>
  )
}

export function ArcadeScreen() {
  const perks: Perk[] = arcadePerks()
  const categories: CategoryCard[] = categoryCards()

  return (
    <Scroll className="flex-1">
      <VStack className="gap-8 p-4">
        <TopRail />
        <TopStrip />
        <Divider />
        <Hero />
        <ChipRow />
        <SectionHeader title="Top Arcade Games" action="" route="arcade" />
        <TopCharts />
        <SectionHeader title="New Games" action="See All" route="arcade" />
        <NewGamesShelf />
        <SectionHeader title="Discover the Perks of Arcade" action="" route="arcade" />
        <HStack className="gap-4">
          <PerkCardView perk={perks[0]} />
          <PerkCardView perk={perks[1]} />
          <PerkCardView perk={perks[2]} />
          <PerkCardView perk={perks[3]} />
        </HStack>
        <SectionHeader title="Game With Fame on Arcade" action="See All" route="arcade" />
        <FameShelf />
        <SectionHeader title="Categories" action="" route="arcade" />
        <HStack className="gap-4">
          <CategoryTile card={categories[0]} />
          <CategoryTile card={categories[1]} />
          <CategoryTile card={categories[2]} />
          <CategoryTile card={categories[3]} />
        </HStack>
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
