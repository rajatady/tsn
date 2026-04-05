import { EditorialCardView, NativeHud, SectionHeader } from '../components'
import { playCards, type EditorialCard } from '../data'

export function PlayScreen() {
  const cards: EditorialCard[] = playCards()

  return (
    <Scroll className="flex-1">
      <VStack className="gap-8 p-4">
        <Text className="text-5xl font-bold">Play</Text>
        <EditorialCardView card={cards[0]} large />
        <HStack className="gap-4">
          <EditorialCardView card={cards[1]} large={false} />
          <EditorialCardView card={cards[2]} large={false} />
          <EditorialCardView card={cards[3]} large={false} />
        </HStack>
        <SectionHeader title="Best New Games and Updates" action="See All" route="play" />
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
