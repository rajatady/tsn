/**
 * Image primitive: sizes, scaling modes, rounded corners, in-row layout
 *
 * Tests that Image elements at various fixed sizes produce the correct
 * geometry in both native and browser. Object-fit modes (cover/contain/fill)
 * don't change the container geometry — they only affect how the image
 * is rendered inside its bounds — so we focus on container sizing.
 */

const testImage: string = 'examples/native-gui/app-store/assets/develop-hero.png'
const iconImage: string = 'examples/native-gui/app-store/assets/icon-dredge.png'

export function ImageDeepCase() {
  return (
    <VStack testId="root" className="gap-4 w-[600] h-[560] bg-zinc-900 p-4">
      <HStack testId="row-sizes" className="items-center gap-4 h-[96]">
        <Image testId="img-sm" src={iconImage} className="w-[40] h-[40] rounded-lg" />
        <Image testId="img-md" src={iconImage} className="w-[64] h-[64] rounded-xl" />
        <Image testId="img-lg" src={iconImage} className="w-[96] h-[96] rounded-2xl" />
      </HStack>
      <Image testId="img-wide" src={testImage} className="w-[568] h-[200] rounded-2xl" />
      <HStack testId="row-icon-text" className="items-center gap-3 h-[56]">
        <Image testId="icon-in-row" src={iconImage} className="w-[52] h-[52] rounded-xl" />
        <VStack testId="text-col" className="flex-1 gap-0">
          <Text className="text-lg font-semibold">App Name</Text>
          <Text className="text-sm text-zinc-400">Description</Text>
        </VStack>
        <Card testId="action-in-row" className="w-[64] h-[28] rounded-full bg-zinc-700" />
      </HStack>
      <HStack testId="row-scaling" className="gap-4 h-[140]">
        <VStack testId="col-cover" className="gap-1 w-[180]">
          <Image testId="img-cover" src={testImage} className="w-[180] h-[120] rounded-xl object-cover" />
          <Text className="text-xs text-zinc-400">cover</Text>
        </VStack>
        <VStack testId="col-contain" className="gap-1 w-[180]">
          <Image testId="img-contain" src={testImage} className="w-[180] h-[120] rounded-xl object-contain" />
          <Text className="text-xs text-zinc-400">contain</Text>
        </VStack>
      </HStack>
    </VStack>
  )
}
