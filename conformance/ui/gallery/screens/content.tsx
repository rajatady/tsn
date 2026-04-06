import { onConformanceAction } from '../state'

export function ContentConformanceScreen() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Content Primitives</Text>

      <Card testId="content.card" className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text testId="content.heading" className="text-4xl font-bold">Display headline</Text>
          <Text testId="content.body" className="text-base text-zinc-400">Supporting body copy should be measurable, selectable, and stable.</Text>
          <Divider testId="content.divider" />
          <HStack className="gap-3">
            <Symbol testId="content.symbol" name="wand.and.rays" size={20} color="blue" />
            <Badge testId="content.badge" text="Stable" color="green" />
            <Stat testId="content.stat" value="120fps" label="Frame pace" color="purple" />
          </HStack>
        </VStack>
      </Card>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text className="text-xs text-zinc-400">BUTTONS</Text>
          <HStack testId="content.buttons.row" className="gap-3">
            <Button testId="content.button.primary" variant="primary" onClick={onConformanceAction} tag={101}>Primary</Button>
            <Button testId="content.button.ghost" variant="ghost" onClick={onConformanceAction} tag={102}>Ghost</Button>
            <Button testId="content.button.get" variant="get" onClick={onConformanceAction} tag={103}>Get</Button>
            <Button testId="content.button.link" variant="link" onClick={onConformanceAction} tag={104}>Link</Button>
            <Button testId="content.button.icon" variant="ghost" icon="arrow.clockwise" onClick={onConformanceAction} tag={105}>Refresh</Button>
          </HStack>
        </VStack>
      </Card>
    </VStack>
  )
}
