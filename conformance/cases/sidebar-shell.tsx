export function SidebarShellCase() {
  return (
    <HStack testId="root" className="gap-3 h-[500] w-[900] bg-black p-2">
      <Card testId="sidebar" className="w-[220] h-[496] rounded-xl bg-zinc-900 p-3">
        <VStack className="gap-2">
          <Text className="text-xs text-zinc-400">NAVIGATION</Text>
          <Card className="h-[32] rounded-lg bg-zinc-800" />
          <Card className="h-[32] rounded-lg bg-zinc-800" />
          <Card className="h-[32] rounded-lg bg-zinc-800" />
        </VStack>
      </Card>
      <Card testId="content" className="flex-1 h-[496] rounded-xl bg-zinc-900 p-4">
        <Text className="text-2xl font-bold">Content Area</Text>
      </Card>
    </HStack>
  )
}
