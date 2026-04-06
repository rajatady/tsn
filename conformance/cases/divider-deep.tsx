/**
 * Divider primitive: horizontal separators between content blocks
 *
 * NSBox separator. Tests dividers between cards and inside stacks
 * to verify they render as thin lines and don't break layout spacing.
 */
export function DividerDeepCase() {
  return (
    <VStack testId="root" className="gap-3 w-[500] bg-zinc-900 p-4">
      <Card testId="block-a" className="h-[40] rounded-xl bg-zinc-800" />
      <Divider testId="div-1" />
      <Card testId="block-b" className="h-[40] rounded-xl bg-zinc-800" />
      <Divider testId="div-2" />
      <Card testId="block-c" className="h-[40] rounded-xl bg-zinc-800" />
      <Divider testId="div-3" />
      <HStack testId="row-after" className="items-center gap-3 h-[36]">
        <Card testId="left" className="w-[100] h-[24] rounded bg-zinc-800" />
        <Card testId="right" className="flex-1 h-[24] rounded bg-zinc-800" />
      </HStack>
    </VStack>
  )
}
