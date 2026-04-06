import { AppRow, NativeHud } from '../components'
import {
  discoverLatestGames,
  newGames,
  playCards,
  type EditorialCard,
  type StoreApp,
} from '../data'

function PlayHeroCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  const hid: string = 'play-hero-' + idx

  return (
    <ZStack className="w-[1096] rounded-2xl overflow-hidden">
      <Image src={image} className="aspect-[22/10] object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack className="justify-end p-8 gap-1">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-wide truncate">{eyebrow}</Text>
        <Text className="text-[34] font-bold leading-tight tracking-tight truncate">{title}</Text>
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
    <VStack className="w-[340] gap-0">
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
        {PlayGameCard(3, cards[3].eyebrow, cards[3].title, cards[3].subtitle, cards[3].image)}
        {PlayGameCard(4, cards[4].eyebrow, cards[4].title, cards[4].subtitle, cards[4].image)}
      </HStack>
    </Scroll>
  )
}

function NewReleasesGrid() {
  const apps: StoreApp[] = newGames()

  return (
    <HStack className="gap-0">
      <VStack className="flex-1 gap-0">
        <AppRow app={apps[0]} testId="pr-0" />
        <Divider />
        <AppRow app={apps[3]} testId="pr-3" />
      </VStack>
      <VStack className="flex-1 gap-0">
        <AppRow app={apps[1]} testId="pr-1" />
        <Divider />
        <AppRow app={apps[4]} testId="pr-4" />
      </VStack>
      <VStack className="flex-1 gap-0">
        <AppRow app={apps[2]} testId="pr-2" />
        <Divider />
        <AppRow app={apps[5]} testId="pr-5" />
      </VStack>
    </HStack>
  )
}

export function PlayScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-8 py-5">
        <Text className="text-[32] font-bold tracking-tight">Play</Text>
        <VStack className="h-[20]" />
        <PlayHeroCarousel />
        <VStack className="h-[24]" />
        <Text className="text-[22] font-bold tracking-tight">Best New Games</Text>
        <VStack className="h-[16]" />
        <BestNewGamesCarousel />
        <VStack className="h-[40]" />
        <Text className="text-[22] font-bold tracking-tight">New Releases</Text>
        <VStack className="h-[16]" />
        <NewReleasesGrid />
        <VStack className="h-[40]" />
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
