/**
 * Search + Input primitives: sizing, in-row positioning
 *
 * Tests that Search and Input elements at various widths produce
 * correct geometry inside HStack rows with labels and buttons.
 * Native NSSearchField/NSTextField have fixed heights determined
 * by the system, so we focus on width and container positioning.
 */
export function InputDeepCase() {
  return (
    <VStack testId="root" className="gap-4 w-[500] h-[340] bg-zinc-900 p-4">
      <HStack testId="row-search" className="items-center gap-3 h-[36]">
        <Text className="text-sm text-zinc-400">Search:</Text>
        <Search testId="search-w200" placeholder="Search items..." className="w-[200]" />
      </HStack>
      <HStack testId="row-search-wide" className="items-center gap-3 h-[36]">
        <Text className="text-sm text-zinc-400">Wide:</Text>
        <Search testId="search-w350" placeholder="Wide search..." className="w-[350]" />
      </HStack>
      <Divider testId="sep" />
      <HStack testId="row-input" className="items-center gap-3 h-[36]">
        <Text className="text-sm text-zinc-400">Input:</Text>
        <Input testId="input-w200" placeholder="Enter text..." className="w-[200]" />
      </HStack>
      <HStack testId="row-input-wide" className="items-center gap-3 h-[36]">
        <Text className="text-sm text-zinc-400">Wide:</Text>
        <Input testId="input-w350" placeholder="Wide input..." className="w-[350]" />
      </HStack>
      <Divider testId="sep2" />
      <HStack testId="row-combined" className="items-center gap-3 h-[36]">
        <Search testId="search-combo" placeholder="Filter..." className="w-[180]" />
        <Card testId="spacer-card" className="flex-1 h-[28] rounded bg-zinc-800" />
        <Card testId="action-card" className="w-[60] h-[28] rounded-full bg-zinc-700" />
      </HStack>
    </VStack>
  )
}
