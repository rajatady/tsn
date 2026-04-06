export function SpacerCase() {
  return (
    <VStack testId="root" className="gap-3 h-[500] w-[300] bg-zinc-900 p-4">
      <Card testId="header" className="h-[40] rounded-xl bg-zinc-700" />
      <Spacer />
      <Card testId="footer" className="h-[40] rounded-xl bg-zinc-700" />
    </VStack>
  )
}
