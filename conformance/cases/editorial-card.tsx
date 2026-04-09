export function EditorialCardCase() {
  return (
    <HStack testId="root" className="gap-4 w-[740] bg-zinc-900 p-4">
      <VStack testId="card-a" className="w-[340] gap-0">
        <Card testId="img-a" className="rounded-xl h-[212] bg-zinc-700" />
        <VStack className="h-[8]" />
        <Text testId="eyebrow-a" className="text-xs text-zinc-400 uppercase tracking-wide">Featured</Text>
        <VStack className="h-[2]" />
        <Text testId="title-a" className="text-base font-semibold">Creative Suite Pro</Text>
        <VStack className="h-[2]" />
        <Text testId="sub-a" className="text-sm text-zinc-400">Design tools reimagined</Text>
      </VStack>
      <VStack testId="card-b" className="w-[340] gap-0">
        <Card testId="img-b" className="rounded-xl h-[212] bg-zinc-700" />
        <VStack className="h-[8]" />
        <Text testId="eyebrow-b" className="text-xs text-zinc-400 uppercase tracking-wide">New Release</Text>
        <VStack className="h-[2]" />
        <Text testId="title-b" className="text-base font-semibold">Weather Plus</Text>
        <VStack className="h-[2]" />
        <Text testId="sub-b" className="text-sm text-zinc-400">Forecast at a glance</Text>
      </VStack>
    </HStack>
  )
}
