/**
 * Text primitive: all Tailwind size classes
 *
 * Tests that every text-{size} class produces the correct intrinsic height
 * when rendered inside a fixed-width VStack. The height of each Text element
 * is determined by the font size + line height, and must match the browser.
 */
export function TextSizesCase() {
  return (
    <VStack testId="root" className="gap-2 w-[400] bg-zinc-900 p-4">
      <HStack testId="row-xs" className="items-center gap-3 h-[28]">
        <Card testId="label-xs" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-xs" className="text-xs">Text xs 12px</Text>
      </HStack>
      <HStack testId="row-sm" className="items-center gap-3 h-[28]">
        <Card testId="label-sm" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-sm" className="text-sm">Text sm 14px</Text>
      </HStack>
      <HStack testId="row-base" className="items-center gap-3 h-[32]">
        <Card testId="label-base" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-base" className="text-base">Text base 16px</Text>
      </HStack>
      <HStack testId="row-lg" className="items-center gap-3 h-[32]">
        <Card testId="label-lg" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-lg" className="text-lg">Text lg 18px</Text>
      </HStack>
      <HStack testId="row-xl" className="items-center gap-3 h-[36]">
        <Card testId="label-xl" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-xl" className="text-xl">Text xl 20px</Text>
      </HStack>
      <HStack testId="row-2xl" className="items-center gap-3 h-[40]">
        <Card testId="label-2xl" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-2xl" className="text-2xl font-bold">Text 2xl 24px</Text>
      </HStack>
      <HStack testId="row-3xl" className="items-center gap-3 h-[48]">
        <Card testId="label-3xl" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-3xl" className="text-3xl font-bold">Text 3xl 30px</Text>
      </HStack>
      <HStack testId="row-4xl" className="items-center gap-3 h-[56]">
        <Card testId="label-4xl" className="w-[60] h-[20] rounded bg-zinc-800" />
        <Text testId="text-4xl" className="text-4xl font-bold">Text 4xl 36px</Text>
      </HStack>
    </VStack>
  )
}
