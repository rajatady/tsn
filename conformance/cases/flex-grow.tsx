export function FlexGrowCase() {
  return (
    <HStack testId="root" className="gap-3 h-[60] w-[600] bg-zinc-900 p-3">
      <Card testId="fixed" className="w-[100] h-[40] rounded-xl bg-zinc-700" />
      <Card testId="flex" className="flex-1 h-[40] rounded-xl bg-zinc-700" />
    </HStack>
  )
}
