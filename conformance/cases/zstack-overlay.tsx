export function ZstackOverlayCase() {
  return (
    <VStack testId="root" className="w-[500] bg-zinc-900 p-4">
      <ZStack testId="hero" className="w-[468] h-[200] rounded-2xl overflow-hidden">
        <Card testId="bg-layer" className="bg-zinc-700" />
        <VStack testId="text-layer" className="justify-end p-6 gap-1">
          <Text testId="eyebrow" className="text-xs text-zinc-400 uppercase">Featured</Text>
          <Text testId="title" className="text-2xl font-bold">Hero Title</Text>
          <Text testId="subtitle" className="text-sm text-zinc-400">A subtitle below</Text>
        </VStack>
      </ZStack>
    </VStack>
  )
}
