export function PlayScreen() {
  return (
    <VStack className="flex-1 gap-4 p-5">
      <Text className="text-3xl font-bold">Play</Text>
      <Text className="text-sm text-zinc-400">A second routed destination for the new native navigation layer.</Text>
      <Card className="rounded-xl">
        <VStack className="gap-2">
          <Text className="text-sm text-zinc-400">APPLE ARCADE</Text>
          <Text className="text-2xl font-bold">Can you build a lasting empire?</Text>
          <Text className="text-sm text-zinc-400">The next passes will add richer media, image loading, and scroll-driven transitions.</Text>
        </VStack>
      </Card>
      <Card className="rounded-xl">
        <VStack className="gap-2">
          <Text className="text-lg font-bold">Best New Games and Updates</Text>
          <Text className="text-sm text-zinc-400">Routing is already native and persistent across screens.</Text>
        </VStack>
      </Card>
    </VStack>
  )
}
