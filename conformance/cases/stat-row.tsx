export function StatRowCase() {
  return (
    <HStack testId="root" className="gap-4 h-[120] w-[700] bg-zinc-900 p-3">
      <Card testId="stat1" className="flex-1 h-[96] rounded-xl bg-zinc-800 p-4">
        <VStack className="gap-1">
          <Text className="text-xs text-zinc-400">REVENUE</Text>
          <Text className="text-2xl font-bold">$12.4M</Text>
        </VStack>
      </Card>
      <Card testId="stat2" className="flex-1 h-[96] rounded-xl bg-zinc-800 p-4">
        <VStack className="gap-1">
          <Text className="text-xs text-zinc-400">USERS</Text>
          <Text className="text-2xl font-bold">84K</Text>
        </VStack>
      </Card>
      <Card testId="stat3" className="flex-1 h-[96] rounded-xl bg-zinc-800 p-4">
        <VStack className="gap-1">
          <Text className="text-xs text-zinc-400">UPTIME</Text>
          <Text className="text-2xl font-bold">99.9%</Text>
        </VStack>
      </Card>
    </HStack>
  )
}
