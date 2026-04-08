export function HorizontalScrollCase() {
  return (
    <VStack testId="root" className="w-[500] h-[200] bg-zinc-900 p-4">
      <Scroll testId="scroller" className="overflow-x-auto">
        <HStack testId="row" className="gap-4">
          <Card testId="item-a" className="w-[200] h-[140] rounded-xl bg-zinc-800 p-3">
            <Text className="text-sm">Card A</Text>
          </Card>
          <Card testId="item-b" className="w-[200] h-[140] rounded-xl bg-zinc-700 p-3">
            <Text className="text-sm">Card B</Text>
          </Card>
          <Card testId="item-c" className="w-[200] h-[140] rounded-xl bg-zinc-800 p-3">
            <Text className="text-sm">Card C</Text>
          </Card>
          <Card testId="item-d" className="w-[200] h-[140] rounded-xl bg-zinc-700 p-3">
            <Text className="text-sm">Card D</Text>
          </Card>
        </HStack>
      </Scroll>
    </VStack>
  )
}
