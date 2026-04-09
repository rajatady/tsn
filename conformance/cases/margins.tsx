export function MarginsCase() {
  return (
    <VStack testId="root" className="w-[500px] bg-zinc-900 p-4 gap-0">
      <VStack testId="hero" className="h-[60px] rounded-xl bg-zinc-800 mb-6" />
      <VStack testId="title" className="h-[33px] rounded bg-zinc-700 mb-4" />
      <HStack testId="row" className="gap-4 mb-10">
        <VStack testId="card-a" className="w-[355px] h-[292px] rounded-xl bg-zinc-800" />
        <VStack testId="card-b" className="w-[355px] h-[292px] rounded-xl bg-zinc-700" />
      </HStack>
      <VStack testId="footer" className="h-[20px] rounded bg-zinc-800 mt-[2px]" />
    </VStack>
  )
}
