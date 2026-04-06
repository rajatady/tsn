export function PaddingGapCase() {
  return (
    <VStack testId="root" className="gap-4 p-5 h-[200] w-[400] bg-zinc-900">
      <Card testId="a" className="h-[40] rounded-xl bg-zinc-700" />
      <Card testId="b" className="h-[40] rounded-xl bg-zinc-700" />
      <Card testId="c" className="h-[40] rounded-xl bg-zinc-700" />
    </VStack>
  )
}
