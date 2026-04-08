export function FlexBasisCase() {
  return (
    <HStack testId="root" className="gap-4 h-[96] w-[700] bg-zinc-900 p-3">
      <Card testId="col1" className="flex-1 h-[72] rounded-xl bg-zinc-800 p-3">
        <Text className="text-xs text-zinc-400">SHORT</Text>
      </Card>
      <Card testId="col2" className="flex-1 h-[72] rounded-xl bg-zinc-800 p-3">
        <Text className="text-xs text-zinc-400">MEDIUM LENGTH</Text>
      </Card>
      <Card testId="col3" className="flex-1 h-[72] rounded-xl bg-zinc-800 p-3">
        <Text className="text-xs text-zinc-400">A MUCH LONGER LABEL HERE</Text>
      </Card>
    </HStack>
  )
}
