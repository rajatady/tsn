/**
 * Text primitive: all font weights at the same size
 *
 * Tests that font-thin through font-black produce distinct
 * intrinsic widths (heavier weights are wider) and consistent heights.
 * All at text-lg (18px) in a VStack with fixed width.
 */
export function TextWeightsCase() {
  return (
    <VStack testId="root" className="gap-1 w-[500] bg-zinc-900 p-4">
      <HStack testId="row-thin" className="items-center gap-3 h-[28]">
        <Card testId="swatch-thin" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-thin" className="text-lg font-thin">Thin weight</Text>
      </HStack>
      <HStack testId="row-light" className="items-center gap-3 h-[28]">
        <Card testId="swatch-light" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-light" className="text-lg font-light">Light weight</Text>
      </HStack>
      <HStack testId="row-normal" className="items-center gap-3 h-[28]">
        <Card testId="swatch-normal" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-normal" className="text-lg font-normal">Normal weight</Text>
      </HStack>
      <HStack testId="row-medium" className="items-center gap-3 h-[28]">
        <Card testId="swatch-medium" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-medium" className="text-lg font-medium">Medium weight</Text>
      </HStack>
      <HStack testId="row-semibold" className="items-center gap-3 h-[28]">
        <Card testId="swatch-semibold" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-semibold" className="text-lg font-semibold">Semibold weight</Text>
      </HStack>
      <HStack testId="row-bold" className="items-center gap-3 h-[28]">
        <Card testId="swatch-bold" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-bold" className="text-lg font-bold">Bold weight</Text>
      </HStack>
      <HStack testId="row-black" className="items-center gap-3 h-[28]">
        <Card testId="swatch-black" className="w-[80] h-[20] rounded bg-zinc-800" />
        <Text testId="wt-black" className="text-lg font-black">Black weight</Text>
      </HStack>
    </VStack>
  )
}
