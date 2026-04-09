export function ViewBorderCase() {
  return (
    <VStack testId="root" className="w-[520] bg-zinc-950 p-6">
      <View testId="panel" className="w-[220] h-[120] rounded-xl border border-white/20 bg-zinc-900 p-4">
        <Text testId="title" className="text-sm font-semibold text-white">View Panel</Text>
        <Text testId="body" className="text-sm text-zinc-400">Border and padding should come from low-level styles.</Text>
      </View>
    </VStack>
  )
}
