export function MetricStripCase() {
  return (
    <HStack testId="root" className="items-center py-4 w-[600] bg-zinc-900">
      <VStack testId="m1" className="flex-1 items-center gap-1">
        <Text className="text-xs text-zinc-400">RATINGS</Text>
        <Text testId="m1-val" className="text-2xl font-bold">4.8</Text>
        <Text className="text-xs text-zinc-400">out of 5</Text>
      </VStack>
      <Divider />
      <VStack testId="m2" className="flex-1 items-center gap-1">
        <Text className="text-xs text-zinc-400">AGE</Text>
        <Text testId="m2-val" className="text-2xl font-bold">12+</Text>
        <Text className="text-xs text-zinc-400">Years Old</Text>
      </VStack>
      <Divider />
      <VStack testId="m3" className="flex-1 items-center gap-1">
        <Text className="text-xs text-zinc-400">SIZE</Text>
        <Text testId="m3-val" className="text-2xl font-bold">245</Text>
        <Text className="text-xs text-zinc-400">MB</Text>
      </VStack>
    </HStack>
  )
}
