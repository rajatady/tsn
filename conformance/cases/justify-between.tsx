export function JustifyBetweenCase() {
  return (
    <HStack testId="root" className="justify-between items-center h-[48] w-[500] bg-zinc-900 px-4">
      <Text testId="left" className="text-2xl font-bold">Section Title</Text>
      <Card testId="right" className="w-[70] h-[28] rounded-full bg-zinc-700" />
    </HStack>
  )
}
