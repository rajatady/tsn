export function FixedSizesCase() {
  return (
    <HStack testId="root" className="gap-4 h-[100] w-[600] bg-zinc-900 p-3">
      <Card testId="a" className="w-[180] h-[70] rounded-xl bg-zinc-700" />
      <Card testId="b" className="w-[240] h-[70] rounded-xl bg-zinc-700" />
      <Card testId="c" className="w-[100] h-[70] rounded-xl bg-zinc-700" />
    </HStack>
  )
}
