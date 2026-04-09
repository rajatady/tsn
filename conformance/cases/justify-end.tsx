export function JustifyEndCase() {
  return (
    <VStack testId="root" className="justify-end gap-1 p-8 h-[300] w-[500] bg-zinc-900">
      <Text testId="title" className="text-2xl font-bold">Bottom Title</Text>
      <Text testId="subtitle" className="text-sm text-zinc-400">Anchored to the bottom</Text>
    </VStack>
  )
}
