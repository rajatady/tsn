export function ItemsEndCase() {
  return (
    <HStack testId="root" className="items-end gap-6 p-4 h-[200] w-[500] bg-zinc-900">
      <Card testId="tall" className="w-[100] h-[160] rounded-xl bg-zinc-700" />
      <Card testId="short" className="w-[100] h-[60] rounded-xl bg-zinc-800" />
      <Card testId="medium" className="w-[100] h-[100] rounded-xl bg-zinc-700" />
    </HStack>
  )
}
