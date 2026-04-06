import { arcadeHeroImage } from '../assets'
import {
  AppRow,
  PerkCardView,
  SectionHeader,
} from '../components'
import {
  arcadeChipList,
  arcadePerks,
  discoverLatestGames,
  topArcadeGames,
  type EditorialCard,
  type Perk,
  type RankedApp,
} from '../data'
import { openStoreApp } from '../store'

function ArcadeHero() {
  return (
    <ZStack className="rounded-2xl overflow-hidden">
      <Image src={arcadeHeroImage} className="aspect-[23/10] object-cover" />
      <Gradient from="black/70" to="transparent" direction="to-top" />
      <VStack className="justify-end p-7 gap-1">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-wide truncate">New Game</Text>
        <Text className="text-[36] font-bold leading-tight tracking-tight truncate">Rural Life Village</Text>
        <Text className="text-[15] text-white/55 truncate">Farm, craft, and explore a peaceful countryside</Text>
      </VStack>
    </ZStack>
  )
}

function ChipRow() {
  const chips: string[] = arcadeChipList()

  return (
    <Scroll className="overflow-x-auto">
      <HStack className="gap-2">
        <Button variant="chip" onClick={openStoreApp} tag={1}>Action</Button>
        <Button variant="chip" onClick={openStoreApp} tag={2}>Adventure</Button>
        <Button variant="chip" onClick={openStoreApp} tag={3}>Casual</Button>
        <Button variant="chip" onClick={openStoreApp} tag={4}>Family</Button>
        <Button variant="chip" onClick={openStoreApp} tag={5}>Puzzle</Button>
        <Button variant="chip" onClick={openStoreApp} tag={6}>Racing</Button>
        <Button variant="chip" onClick={openStoreApp} tag={7}>Simulation</Button>
        <Button variant="chip" onClick={openStoreApp} tag={8}>Sports</Button>
        <Button variant="chip" onClick={openStoreApp} tag={9}>Strategy</Button>
        <Button variant="chip" onClick={openStoreApp} tag={10}>Word</Button>
      </HStack>
    </Scroll>
  )
}

function RankedCard(rank: string, icon: string, label: string, subtitle: string) {
  return (
    <VStack className="w-[140] gap-0 items-center">
      <Text className="text-[36] font-bold text-white/12">{rank}</Text>
      <VStack className="h-[4]" />
      <Image src={icon} className="w-[64] h-[64] rounded-2xl object-cover" />
      <VStack className="h-[8]" />
      <Text className="text-[10] text-white/25 uppercase tracking-wider truncate">Apple Arcade</Text>
      <VStack className="h-[2]" />
      <Text className="text-[13] font-semibold truncate">{label}</Text>
    </VStack>
  )
}

function TopChartsCarousel() {
  const items: RankedApp[] = topArcadeGames()

  return (
    <Scroll className="overflow-x-auto">
      <HStack className="gap-3">
        {RankedCard('1', items[0].app.icon, items[0].app.title, items[0].app.subtitle)}
        {RankedCard('2', items[1].app.icon, items[1].app.title, items[1].app.subtitle)}
        {RankedCard('3', items[2].app.icon, items[2].app.title, items[2].app.subtitle)}
        {RankedCard('4', items[3].app.icon, items[3].app.title, items[3].app.subtitle)}
        {RankedCard('5', items[4].app.icon, items[4].app.title, items[4].app.subtitle)}
        {RankedCard('6', items[5].app.icon, items[5].app.title, items[5].app.subtitle)}
        {RankedCard('7', items[6].app.icon, items[6].app.title, items[6].app.subtitle)}
      </HStack>
    </Scroll>
  )
}

function ArcadeEditCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const eid: string = 'arcade-card-' + idx

  return (
    <VStack testId={eid} className="w-[340] gap-0">
      <Image src={image} className="rounded-xl aspect-[16/10] object-cover" />
      <VStack className="h-[8]" />
      <Text className="text-[11] font-semibold text-white/25 uppercase tracking-wide truncate">{eyebrow}</Text>
      <VStack className="h-[2]" />
      <Text className="text-[15] font-semibold truncate">{title}</Text>
      <VStack className="h-[2]" />
      <Text className="text-[13] text-white/40 truncate">{subtitle}</Text>
    </VStack>
  )
}

function WhatToPlayCarousel() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <Scroll className="overflow-x-auto">
      <HStack className="gap-4">
        {ArcadeEditCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {ArcadeEditCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {ArcadeEditCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
        {ArcadeEditCard(3, cards[3].eyebrow, cards[3].title, cards[3].subtitle, cards[3].image)}
        {ArcadeEditCard(4, cards[4].eyebrow, cards[4].title, cards[4].subtitle, cards[4].image)}
      </HStack>
    </Scroll>
  )
}

function PerksCarousel() {
  const perks: Perk[] = arcadePerks()

  return (
    <Scroll className="overflow-x-auto">
      <HStack className="gap-3">
        <VStack className="w-[240] gap-0">
          <Image src={perks[0].image} className="rounded-xl aspect-[16/9] object-cover" />
          <VStack className="h-[8]" />
          <Text className="text-[13] font-medium text-white/70 truncate">{perks[0].title}</Text>
        </VStack>
        <VStack className="w-[240] gap-0">
          <Image src={perks[1].image} className="rounded-xl aspect-[16/9] object-cover" />
          <VStack className="h-[8]" />
          <Text className="text-[13] font-medium text-white/70 truncate">{perks[1].title}</Text>
        </VStack>
        <VStack className="w-[240] gap-0">
          <Image src={perks[2].image} className="rounded-xl aspect-[16/9] object-cover" />
          <VStack className="h-[8]" />
          <Text className="text-[13] font-medium text-white/70 truncate">{perks[2].title}</Text>
        </VStack>
        <VStack className="w-[240] gap-0">
          <Image src={perks[3].image} className="rounded-xl aspect-[16/9] object-cover" />
          <VStack className="h-[8]" />
          <Text className="text-[13] font-medium text-white/70 truncate">{perks[3].title}</Text>
        </VStack>
      </HStack>
    </Scroll>
  )
}

export function ArcadeScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-8 py-5">
        <Text className="text-[32] font-bold tracking-tight">Arcade</Text>
        <VStack className="h-[20]" />
        <ArcadeHero />
        <VStack className="h-[24]" />
        <ChipRow />
        <VStack className="h-[24]" />
        <Text className="text-[22] font-bold tracking-tight">Top Arcade Games</Text>
        <VStack className="h-[16]" />
        <TopChartsCarousel />
        <VStack className="h-[40]" />
        <Text className="text-[22] font-bold tracking-tight">What to Play</Text>
        <VStack className="h-[16]" />
        <WhatToPlayCarousel />
        <VStack className="h-[40]" />
        <Text className="text-[22] font-bold tracking-tight">Perks of Apple Arcade</Text>
        <VStack className="h-[16]" />
        <PerksCarousel />
      </VStack>
    </Scroll>
  )
}
