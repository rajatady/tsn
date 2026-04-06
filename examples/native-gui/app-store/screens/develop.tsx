import { AppRow, NativeHud } from '../components'
import { developCards, developerApps, type EditorialCard, type StoreApp } from '../data'

function DevHeroCard(idx: number, eyebrow: string, title: string, subtitle: string, image: string) {
  return (
    <ZStack className="w-[536] rounded-2xl overflow-hidden">
      <Image src={image} className="aspect-[16/10] object-cover" />
      <Gradient from="black/60" to="transparent" direction="to-top" />
      <VStack className="justify-end p-6 gap-1">
        <Text className="text-[11] font-bold text-white/50 uppercase tracking-wide truncate">{eyebrow}</Text>
        <Text className="text-[22] font-bold leading-tight tracking-tight truncate">{title}</Text>
        <Text className="text-[13] text-white/55 truncate">{subtitle}</Text>
      </VStack>
    </ZStack>
  )
}

export function DevelopScreen() {
  const cards: EditorialCard[] = developCards()
  const apps: StoreApp[] = developerApps()

  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-8 py-5">
        <Text className="text-[32] font-bold tracking-tight">Develop</Text>
        <VStack className="h-[20]" />
        <HStack className="gap-4">
          {DevHeroCard(0, cards[0].eyebrow, cards[0].title, cards[0].subtitle, cards[0].image)}
          {DevHeroCard(1, cards[1].eyebrow, cards[1].title, cards[1].subtitle, cards[1].image)}
        </HStack>
        <VStack className="h-[40]" />
        <Text className="text-[22] font-bold tracking-tight">Essential Apps for Developers</Text>
        <VStack className="h-[16]" />
        <HStack className="gap-0">
          <VStack className="flex-1 gap-0">
            <AppRow app={apps[0]} testId="dr-0" />
            <Divider />
            <AppRow app={apps[3]} testId="dr-3" />
          </VStack>
          <VStack className="flex-1 gap-0">
            <AppRow app={apps[1]} testId="dr-1" />
            <Divider />
            <AppRow app={apps[4]} testId="dr-4" />
          </VStack>
          <VStack className="flex-1 gap-0">
            <AppRow app={apps[2]} testId="dr-2" />
            <Divider />
            <AppRow app={apps[5]} testId="dr-5" />
          </VStack>
        </HStack>
        <VStack className="h-[40]" />
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
