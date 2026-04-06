import { AppRow, EditorialCardView, NativeHud, SectionHeader } from '../components'
import { developCards, developerApps, type EditorialCard, type StoreApp } from '../data'

export function DevelopScreen() {
  const cards: EditorialCard[] = developCards()
  const apps: StoreApp[] = developerApps()

  return (
    <Scroll className="flex-1">
      <VStack className="gap-8 p-4">
        <Text className="text-5xl font-bold">Develop</Text>
        <HStack className="gap-4">
          <EditorialCardView card={cards[0]} large />
          <EditorialCardView card={cards[1]} large />
        </HStack>
        <SectionHeader title="Essential Apps for Developers" action="See All" route="develop" />
        <HStack className="gap-8">
          <VStack className="flex-1 gap-4">
            <AppRow app={apps[0]} testId="dr-0" />
            <AppRow app={apps[3]} testId="dr-3" />
          </VStack>
          <VStack className="flex-1 gap-4">
            <AppRow app={apps[1]} testId="dr-1" />
            <AppRow app={apps[4]} testId="dr-4" />
          </VStack>
          <VStack className="flex-1 gap-4">
            <AppRow app={apps[2]} testId="dr-2" />
            <AppRow app={apps[5]} testId="dr-5" />
          </VStack>
        </HStack>
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
