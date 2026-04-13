import { arcadeHeroImage, iconRuralLife } from '../assets'
import {
  arcadePerks,
  arcadeWhatToPlayCards,
  topArcadeGames,
  type EditorialCard,
  type Perk,
  type RankedApp,
} from '../data'
import { openStoreApp } from '../store'

function ArcadeViewButton(tag: number, testId: string) {
  return (
    <HStack testId={testId} className="items-center justify-center rounded-full bg-blue/[0.14] px-[18px] py-[4px] ml-2" onClick={openStoreApp} tag={tag}>
      <Text className="text-[14px] font-bold text-[#3b9aff]">View</Text>
    </HStack>
  )
}

function ArcadeHero() {
  return (
    <ZStack testId="hero" className="w-full aspect-[10/13] md:aspect-[23/10] rounded-[24px] overflow-hidden mb-5">
      <Image testId="hero-img" src={arcadeHeroImage} className="w-full h-full object-cover" />
      <Gradient from="black/70" to="transparent" direction="to-top" />
      <VStack className="justify-end p-5 md:p-7">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-[0.15em] mb-1 truncate">New Game</Text>
        <Text className="text-[28] font-bold leading-tight tracking-tight mb-1 truncate">Rural Life Village</Text>
        <Text className="text-[15] text-white/55 mb-4">Farm, craft, and explore a peaceful countryside</Text>
        <HStack testId="hero-info" className="items-center gap-3">
          <Image testId="hero-app-icon" src={iconRuralLife} className="w-[44] h-[44] rounded-xl object-cover" />
          <VStack className="gap-0 flex-1">
            <Text className="text-[11] font-bold text-white/40 uppercase tracking-wider truncate">New Game</Text>
            <Text className="text-[14] font-semibold truncate">Rural Life Village</Text>
          </VStack>
          {ArcadeViewButton(1, 'hero-view')}
        </HStack>
      </VStack>
    </ZStack>
  )
}

function Chip(icon: string, label: string, tag: number, testId: string) {
  return (
    <HStack testId={testId} className="items-center gap-[5px] rounded-full bg-white/[0.06] px-[14px] py-[6px]" onClick={openStoreApp} tag={tag}>
      <Text className="w-[14px] text-center text-[13] text-white/85 truncate">{icon}</Text>
      <Text className="text-[13] font-medium text-white/85 truncate">{label}</Text>
    </HStack>
  )
}

function ChipRow() {
  return (
    <Scroll testId="chip-row" className="overflow-x-auto mb-6">
      <HStack className="gap-2">
        {Chip('💥', 'Action', 1, 'chip-0')}
        {Chip('🏔', 'Adventure', 2, '')}
        {Chip('🎲', 'Casual', 3, '')}
        {Chip('👪', 'Family', 4, '')}
        {Chip('🧩', 'Puzzle', 5, '')}
        {Chip('🏎', 'Racing', 6, '')}
        {Chip('🎮', 'Simulation', 7, '')}
        {Chip('⚽', 'Sports', 8, '')}
        {Chip('☠', 'Strategy', 9, 'chip-8')}
        {Chip('💬', 'Word', 10, 'chip-9')}
      </HStack>
    </Scroll>
  )
}

function RankedCard(rank: string, icon: string, label: string, tag: number, testId: string, iconTestId: string) {
  return (
    <VStack testId={testId} className="items-center rounded-[14px] bg-white/[0.04] px-5 pt-4 pb-[5px] min-w-[190px]" onClick={openStoreApp} tag={tag}>
      <Text className="text-[36] font-bold leading-normal text-white/12 mb-[14px]">{rank}</Text>
      <Image testId={iconTestId} src={icon} className="w-[64] h-[64] rounded-2xl object-cover mb-2 self-center" />
      <Text className="text-[10] text-white/25 uppercase tracking-wider truncate">Apple Arcade</Text>
      <Text className="text-[13] font-semibold mt-[2px] truncate">{label}</Text>
    </VStack>
  )
}

function TopChartsCarousel() {
  const items: RankedApp[] = topArcadeGames()

  return (
    <Scroll testId="top-row" className="overflow-x-auto mb-8">
      <HStack className="gap-3">
        {RankedCard(items[0].rank, items[0].app.icon, items[0].app.title, items[0].app.detailTag, 'top-0', 'top-0-icon')}
        {RankedCard(items[1].rank, items[1].app.icon, items[1].app.title, items[1].app.detailTag, 'top-1', 'top-1-icon')}
        {RankedCard(items[2].rank, items[2].app.icon, items[2].app.title, items[2].app.detailTag, 'top-2', 'top-2-icon')}
        {RankedCard(items[3].rank, items[3].app.icon, items[3].app.title, items[3].app.detailTag, '', '')}
      </HStack>
    </Scroll>
  )
}

function ArcadeEditCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const eid: string = 'what-' + idx

  return (
    <VStack testId={eid} className="w-[248] md:w-[355] min-w-[248] md:min-w-[355] gap-0">
      <VStack className="rounded-xl overflow-hidden mb-2">
        <Image testId={eid + '-img'} src={image} className="w-full aspect-[16/10] object-cover" />
      </VStack>
      <Text className="text-[11] font-semibold text-white/25 uppercase tracking-wide truncate">{eyebrow}</Text>
      <Text className="text-[15] font-semibold mt-[2px] truncate">{title}</Text>
      <Text className="text-[13] text-white/40 mt-[2px]">{subtitle}</Text>
    </VStack>
  )
}

function WhatToPlayCarousel() {
  const cards: EditorialCard[] = arcadeWhatToPlayCards()

  return (
    <Scroll testId="what-row" className="overflow-x-auto mb-8">
      <HStack className="gap-4">
        {ArcadeEditCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {ArcadeEditCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {ArcadeEditCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
        {ArcadeEditCard(3, cards[3].eyebrow, cards[3].title, cards[3].subtitle, cards[3].image)}
      </HStack>
    </Scroll>
  )
}

function PerksCarousel() {
  const perks: Perk[] = arcadePerks()

  return (
    <Scroll testId="perks-row" className="overflow-x-auto">
      <HStack className="gap-3">
        <VStack testId="perk-0" className="w-[220] md:w-[265] min-w-[220] gap-0">
          <VStack className="rounded-xl overflow-hidden">
            <Image testId="perk-0-img" src={perks[0].image} className="w-full aspect-[16/9] object-cover" />
          </VStack>
          <Text className="text-[13] font-medium text-white/70 mt-2 truncate">{perks[0].title}</Text>
        </VStack>
        <VStack testId="perk-1" className="w-[220] md:w-[265] min-w-[220] gap-0">
          <VStack className="rounded-xl overflow-hidden">
            <Image testId="perk-1-img" src={perks[1].image} className="w-full aspect-[16/9] object-cover" />
          </VStack>
          <Text className="text-[13] font-medium text-white/70 mt-2 truncate">{perks[1].title}</Text>
        </VStack>
        <VStack testId="perk-2" className="w-[220] md:w-[265] min-w-[220] gap-0">
          <VStack className="rounded-xl overflow-hidden">
            <Image testId="perk-2-img" src={perks[2].image} className="w-full aspect-[16/9] object-cover" />
          </VStack>
          <Text className="text-[13] font-medium text-white/70 mt-2 truncate">{perks[2].title}</Text>
        </VStack>
        <VStack testId="perk-3" className="w-[220] md:w-[265] min-w-[220] gap-0">
          <VStack className="rounded-xl overflow-hidden">
            <Image testId="perk-3-img" src={perks[3].image} className="w-full aspect-[16/9] object-cover" />
          </VStack>
          <Text className="text-[13] font-medium text-white/70 mt-2 truncate">{perks[3].title}</Text>
        </VStack>
      </HStack>
    </Scroll>
  )
}

export function ArcadeScreen() {
  return (
    <Scroll testId="content" className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-5 md:px-8 pt-5 pb-10 md:pb-12">
        <Text testId="page-title" className="text-[20] font-bold leading-normal tracking-tight mb-4">Arcade</Text>
        <ArcadeHero />
        <ChipRow />
        <Text testId="section-top-title" className="text-[18] font-bold leading-normal tracking-tight mb-3">Top Arcade Games</Text>
        <TopChartsCarousel />
        <Text testId="section-what-title" className="text-[18] font-bold leading-normal tracking-tight mb-3">What to Play</Text>
        <WhatToPlayCarousel />
        <Text testId="section-perks-title" className="text-[18] font-bold leading-normal tracking-tight mb-3">Perks of Apple Arcade</Text>
        <PerksCarousel />
      </VStack>
    </Scroll>
  )
}
