import { developSpotlightImage, categoryFamilyImage, categoryPuzzleImage, playCardTwoImage } from '../../../../examples/native-gui/app-store/assets'

export function LayoutConformanceScreen() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Layout Primitives</Text>

      <Card testId="layout.content-rail" className="rounded-2xl bg-zinc-800">
        <HStack className="gap-6 p-6">
          <VStack className="max-w-[280] gap-2">
            <Text testId="layout.sidebar.title" className="text-xs text-zinc-400">LAYOUT</Text>
            <Text className="text-4xl font-bold">Centered content rails should stay predictable.</Text>
            <Text className="text-base text-zinc-400">This is the shell geometry case that future providers must match.</Text>
          </VStack>
          <Spacer />
          <Image testId="layout.hero-image" src={developSpotlightImage} className="w-[560] h-[260] rounded-2xl" />
        </HStack>
      </Card>

      <Scroll testId="layout.rail" className="h-[244] overflow-x-auto">
        <HStack className="gap-4">
          <Card testId="layout.rail.card.1" className="w-[360] rounded-2xl bg-zinc-800">
            <VStack className="gap-3 p-5">
              <Text className="text-xs text-zinc-400">CARD 1</Text>
              <Image src={categoryPuzzleImage} className="w-[320] h-[180] rounded-xl" />
            </VStack>
          </Card>
          <Card testId="layout.rail.card.2" className="w-[360] rounded-2xl bg-zinc-800">
            <VStack className="gap-3 p-5">
              <Text className="text-xs text-zinc-400">CARD 2</Text>
              <Image src={categoryFamilyImage} className="w-[320] h-[180] rounded-xl" />
            </VStack>
          </Card>
          <Card testId="layout.rail.card.3" className="w-[360] rounded-2xl bg-zinc-800">
            <VStack className="gap-3 p-5">
              <Text className="text-xs text-zinc-400">CARD 3</Text>
              <Image src={playCardTwoImage} className="w-[320] h-[180] rounded-xl" />
            </VStack>
          </Card>
        </HStack>
      </Scroll>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <VStack testId="layout.vstack" className="gap-2">
            <Text className="text-lg font-bold">VStack sample</Text>
            <Text className="text-sm text-zinc-400">Child two</Text>
            <Text className="text-sm text-zinc-400">Child three</Text>
          </VStack>
          <Divider testId="layout.divider" />
          <HStack testId="layout.hstack" className="gap-3">
            <Text>Left</Text>
            <Spacer />
            <Text>Right</Text>
          </HStack>
        </VStack>
      </Card>

      <VStack testId="layout.footer-case" className="rounded-2xl bg-zinc-800 p-4 gap-4 h-[520]">
        <Text className="text-xs text-zinc-400">SIDEBAR FOOTER CASE</Text>
        <Card className="rounded-xl bg-zinc-900">
          <Text className="text-sm font-bold">Pinned top content</Text>
        </Card>
        <Spacer testId="layout.spacer" />
        <Card testId="layout.footer" className="rounded-xl bg-zinc-900">
          <Text className="text-sm font-bold">Bottom pinned footer</Text>
        </Card>
      </VStack>
    </VStack>
  )
}
