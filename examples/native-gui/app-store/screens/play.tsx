import { AppRow, NativeHud } from '../components'
import {
  discoverLatestGames,
  newGames,
  playCards,
  type EditorialCard,
  type StoreApp,
} from '../data'

function PlayHeroCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <ZStack className="w-[280] md:w-[720] min-w-[280] md:min-w-[720] rounded-2xl overflow-hidden">
      <Image src={image} className="aspect-[22/10] object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack className="justify-end gap-1 p-5 md:p-8">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-wide truncate">{eyebrow}</Text>
        <Text className="text-[28] font-bold leading-tight tracking-tight truncate">{title}</Text>
        <Text className="text-[15] text-white/55 truncate">{subtitle}</Text>
      </VStack>
    </ZStack>
  )
}

function PlayHeroCarousel() {
  const cards: EditorialCard[] = playCards()

  return (
    <Scroll className="overflow-x-auto rounded-2xl">
      <HStack className="gap-4">
        {PlayHeroCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {PlayHeroCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {PlayHeroCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
        {PlayHeroCard(3, cards[3].eyebrow, cards[3].title, cards[3].subtitle, cards[3].image)}
      </HStack>
    </Scroll>
  )
}

function PlayGameCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <VStack className="w-[248] md:w-[340] min-w-[248] md:min-w-[340] gap-0">
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

function BestNewGamesCarousel() {
  const cards: EditorialCard[] = discoverLatestGames()

  return (
    <Scroll className="overflow-x-auto">
      <HStack className="gap-4">
        {PlayGameCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
        {PlayGameCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        {PlayGameCard(2, cards[2].eyebrow, cards[2].title, cards[2].subtitle, cards[2].image)}
      </HStack>
    </Scroll>
  )
}

function NewReleasesList() {
  const apps: StoreApp[] = newGames()

  return (
    <VStack className="gap-0">
      <AppRow app={apps[0]} testId="pr-0" />
      <Divider />
      <AppRow app={apps[1]} testId="pr-1" />
      <Divider />
      <AppRow app={apps[2]} testId="pr-2" />
      <Divider />
      <AppRow app={apps[3]} testId="pr-3" />
      <Divider />
      <AppRow app={apps[4]} testId="pr-4" />
      <Divider />
      <AppRow app={apps[5]} testId="pr-5" />
    </VStack>
  )
}

export function PlayScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-5 md:px-8 pt-5 pb-10 md:pb-12">
        <Text className="text-[20] font-bold tracking-tight">Play</Text>
        <VStack className="h-[16]" />
        <PlayHeroCarousel />
        <VStack className="h-[24]" />
        <Text className="text-[18] font-bold tracking-tight">Best New Games</Text>
        <VStack className="h-[12]" />
        <BestNewGamesCarousel />
        <VStack className="h-[24]" />
        <Text className="text-[18] font-bold tracking-tight">New Releases</Text>
        <VStack className="h-[12]" />
        <NewReleasesList />
        <VStack className="h-[24]" />
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
