export function MaxWidthCase() {
  return (
    <VStack testId="root" className="h-[100] w-[800] bg-zinc-900">
      <Card testId="rail" className="max-w-[500] mx-auto h-[60] rounded-xl bg-zinc-700" />
    </VStack>
  )
}
