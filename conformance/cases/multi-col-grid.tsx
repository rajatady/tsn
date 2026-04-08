export function MultiColGridCase() {
  return (
    <HStack testId="root" className="gap-0 w-[600] bg-zinc-900">
      <VStack testId="col-a" className="flex-1 gap-0">
        <Card testId="a1" className="h-[48] rounded-xl bg-zinc-800 p-3">
          <Text className="text-sm">Row 1</Text>
        </Card>
        <Divider />
        <Card testId="a2" className="h-[48] rounded-xl bg-zinc-800 p-3">
          <Text className="text-sm">Row 2</Text>
        </Card>
        <Divider />
        <Card testId="a3" className="h-[48] rounded-xl bg-zinc-800 p-3">
          <Text className="text-sm">Row 3</Text>
        </Card>
      </VStack>
      <VStack testId="col-b" className="flex-1 gap-0">
        <Card testId="b1" className="h-[48] rounded-xl bg-zinc-700 p-3">
          <Text className="text-sm">Row 1</Text>
        </Card>
        <Divider />
        <Card testId="b2" className="h-[48] rounded-xl bg-zinc-700 p-3">
          <Text className="text-sm">Row 2</Text>
        </Card>
        <Divider />
        <Card testId="b3" className="h-[48] rounded-xl bg-zinc-700 p-3">
          <Text className="text-sm">Row 3</Text>
        </Card>
      </VStack>
      <VStack testId="col-c" className="flex-1 gap-0">
        <Card testId="c1" className="h-[48] rounded-xl bg-zinc-800 p-3">
          <Text className="text-sm">Row 1</Text>
        </Card>
        <Divider />
        <Card testId="c2" className="h-[48] rounded-xl bg-zinc-800 p-3">
          <Text className="text-sm">Row 2</Text>
        </Card>
        <Divider />
        <Card testId="c3" className="h-[48] rounded-xl bg-zinc-800 p-3">
          <Text className="text-sm">Row 3</Text>
        </Card>
      </VStack>
    </HStack>
  )
}
