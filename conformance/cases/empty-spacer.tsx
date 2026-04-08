export function EmptySpacerCase() {
  return (
    <VStack testId="root" className="gap-0 w-[400] bg-zinc-900 p-4">
      <Card testId="block-a" className="h-[40] rounded-xl bg-zinc-800" />
      <VStack testId="gap-8" className="h-[8]" />
      <Card testId="block-b" className="h-[40] rounded-xl bg-zinc-700" />
      <VStack testId="gap-20" className="h-[20]" />
      <Card testId="block-c" className="h-[40] rounded-xl bg-zinc-800" />
      <VStack testId="gap-2" className="h-[2]" />
      <Card testId="block-d" className="h-[40] rounded-xl bg-zinc-700" />
    </VStack>
  )
}
