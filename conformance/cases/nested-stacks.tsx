export function NestedStacksCase() {
  return (
    <VStack testId="outer" className="gap-3 h-[300] w-[500] bg-zinc-900 p-4">
      <HStack testId="row" className="gap-3 h-[120]">
        <Card testId="left" className="flex-1 h-[120] rounded-xl bg-zinc-700" />
        <Card testId="right" className="flex-1 h-[120] rounded-xl bg-zinc-700" />
      </HStack>
      <Card testId="bottom" className="h-[80] rounded-xl bg-zinc-700" />
    </VStack>
  )
}
