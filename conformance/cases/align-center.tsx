export function AlignCenterCase() {
  return (
    <HStack testId="root" className="items-center gap-3 p-4 h-[80] w-[500] bg-zinc-900">
      <Card testId="icon" className="w-[52] h-[52] rounded-xl bg-zinc-700" />
      <VStack testId="text" className="flex-1 gap-0">
        <Text className="text-lg font-semibold">App Name</Text>
        <Text className="text-sm text-zinc-400">Subtitle</Text>
      </VStack>
      <Card testId="action" className="w-[60] h-[32] rounded-full bg-zinc-700" />
    </HStack>
  )
}
