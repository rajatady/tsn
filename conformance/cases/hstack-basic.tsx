export function HstackBasicCase() {
  return (
    <HStack testId="root" className="gap-3 h-[80] w-[500] bg-zinc-900 p-3">
      <Card testId="a" className="w-[100] h-[60] rounded-xl bg-zinc-700" />
      <Card testId="b" className="w-[120] h-[60] rounded-xl bg-zinc-700" />
      <Card testId="c" className="w-[80] h-[60] rounded-xl bg-zinc-700" />
    </HStack>
  )
}
