/**
 * Progress primitive: determinate and indeterminate bars
 *
 * NSProgressIndicator bar style. value 0-1 for determinate, -1 for indeterminate.
 * Tests progress bars at fixed widths inside padded cards to verify
 * the bar expands to fill width and maintains its native height.
 */
export function ProgressDeepCase() {
  return (
    <VStack testId="root" className="gap-4 w-[500] bg-zinc-900 p-4">
      <VStack testId="card-25" className="gap-2 p-4 rounded-xl bg-zinc-800">
        <Text className="text-sm text-zinc-400">25%</Text>
        <Progress testId="bar-25" value={0.25} />
      </VStack>
      <VStack testId="card-50" className="gap-2 p-4 rounded-xl bg-zinc-800">
        <Text className="text-sm text-zinc-400">50%</Text>
        <Progress testId="bar-50" value={0.5} />
      </VStack>
      <VStack testId="card-75" className="gap-2 p-4 rounded-xl bg-zinc-800">
        <Text className="text-sm text-zinc-400">75%</Text>
        <Progress testId="bar-75" value={0.75} />
      </VStack>
      <VStack testId="card-100" className="gap-2 p-4 rounded-xl bg-zinc-800">
        <Text className="text-sm text-zinc-400">100%</Text>
        <Progress testId="bar-100" value={1.0} />
      </VStack>
      <HStack testId="row-inline" className="items-center gap-3 h-[36]">
        <Card testId="inline-label" className="w-[60] h-[16] rounded bg-zinc-800" />
        <Card testId="bar-wrap" className="flex-1 h-[6] rounded bg-zinc-700" />
      </HStack>
    </VStack>
  )
}
