export function AppRowCase() {
  return (
    <HStack testId="root" className="items-center gap-3 p-3 h-[72] w-[500] bg-zinc-900">
      <Card testId="icon" className="w-[52] h-[52] rounded-xl bg-zinc-700" />
      <VStack testId="labels" className="flex-1 gap-0">
        <Text testId="title" className="text-lg font-semibold">Helm for App Store</Text>
        <Text testId="subtitle" className="text-sm text-zinc-400">Manage updates</Text>
      </VStack>
      <Card testId="action" className="w-[64] h-[28] rounded-full bg-zinc-700" />
    </HStack>
  )
}
