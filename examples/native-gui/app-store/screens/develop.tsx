export function DevelopScreen() {
  return (
    <VStack className="flex-1 gap-4 p-5">
      <Text className="text-3xl font-bold">Develop</Text>
      <Text className="text-sm text-zinc-400">A routed native page inspired by the App Store’s developer section.</Text>
      <Card className="rounded-xl">
        <VStack className="gap-2">
          <Text className="text-sm text-zinc-400">GET STARTED</Text>
          <Text className="text-2xl font-bold">Code faster with Xcode extensions</Text>
          <Text className="text-sm text-zinc-400">This page exists to prove clean file structure and route-level screen rendering.</Text>
        </VStack>
      </Card>
      <Card className="rounded-xl">
        <VStack className="gap-2">
          <Text className="text-sm text-zinc-400">ESSENTIAL APPS FOR DEVELOPERS</Text>
          <Text className="text-lg font-bold">Prompt 3, TestFlight, Apple Developer, Xcode</Text>
        </VStack>
      </Card>
    </VStack>
  )
}
