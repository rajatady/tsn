export function CardNoPaddingCase() {
  return (
    <VStack testId="root" className="gap-4 w-[400] bg-zinc-900 p-4">
      <Card testId="card-bare" className="rounded-xl bg-zinc-800">
        <Text testId="text-bare" className="text-sm">No padding card</Text>
      </Card>
      <Card testId="card-padded" className="rounded-xl bg-zinc-800 p-4">
        <Text testId="text-padded" className="text-sm">Padded card</Text>
      </Card>
      <Card testId="card-thin" className="rounded-xl bg-zinc-700 h-[6]" />
      <Card testId="card-medium" className="rounded-xl bg-zinc-700 h-[24]" />
    </VStack>
  )
}
