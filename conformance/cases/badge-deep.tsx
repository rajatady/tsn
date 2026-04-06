/**
 * Badge primitive: all color variants in rows
 *
 * Tests that Badge renders with correct sizing and positioning
 * inside items-center rows across all color variants.
 * Badge is a small rounded-rect label: font-size 10, bold, cornerRadius 8.
 */
export function BadgeDeepCase() {
  return (
    <VStack testId="root" className="gap-3 w-[500] bg-zinc-900 p-4">
      <HStack testId="row-blue" className="items-center gap-3 h-[36]">
        <Card testId="label-blue" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-blue" color="blue">Blue</Badge>
      </HStack>
      <HStack testId="row-green" className="items-center gap-3 h-[36]">
        <Card testId="label-green" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-green" color="green">Green</Badge>
      </HStack>
      <HStack testId="row-red" className="items-center gap-3 h-[36]">
        <Card testId="label-red" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-red" color="red">Red</Badge>
      </HStack>
      <HStack testId="row-orange" className="items-center gap-3 h-[36]">
        <Card testId="label-orange" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-orange" color="orange">Orange</Badge>
      </HStack>
      <HStack testId="row-purple" className="items-center gap-3 h-[36]">
        <Card testId="label-purple" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-purple" color="purple">Purple</Badge>
      </HStack>
      <HStack testId="row-pink" className="items-center gap-3 h-[36]">
        <Card testId="label-pink" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-pink" color="pink">Pink</Badge>
      </HStack>
      <HStack testId="row-teal" className="items-center gap-3 h-[36]">
        <Card testId="label-teal" className="w-[80] h-[16] rounded bg-zinc-800" />
        <Badge testId="badge-teal" color="teal">Teal</Badge>
      </HStack>
      <HStack testId="row-multi" className="items-center gap-3 h-[36]">
        <Badge testId="multi-a" color="blue">Info</Badge>
        <Badge testId="multi-b" color="green">OK</Badge>
        <Badge testId="multi-c" color="red">Error</Badge>
      </HStack>
    </VStack>
  )
}
