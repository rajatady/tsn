/**
 * Stat primitive: value/label/color variants in rows
 *
 * UIStatView is a 160×80 custom view with:
 * - Rounded bg (white 0.12, radius 10)
 * - 3px accent bar on left edge (colored)
 * - Value at 28px bold monospaced digits
 * - Label at 11px medium
 *
 * Tests multiple stats in rows to verify sizing and spacing.
 */
export function StatDeepCase() {
  return (
    <VStack testId="root" className="gap-4 w-[560] bg-zinc-900 p-4">
      <HStack testId="row-colors" className="gap-3">
        <Stat testId="stat-blue" value="1,284" label="Users" color="blue" />
        <Stat testId="stat-green" value="98.2%" label="Uptime" color="green" />
        <Stat testId="stat-red" value="12" label="Errors" color="red" />
      </HStack>
      <HStack testId="row-more" className="gap-3">
        <Stat testId="stat-orange" value="47ms" label="Latency" color="orange" />
        <Stat testId="stat-purple" value="3.2k" label="Events" color="purple" />
        <Stat testId="stat-teal" value="512" label="Active" color="teal" />
      </HStack>
      <HStack testId="row-single" className="gap-3 items-center">
        <Stat testId="stat-solo" value="42" label="Answer" color="blue" />
        <Card testId="filler" className="flex-1 h-[80] rounded-xl bg-zinc-800" />
      </HStack>
    </VStack>
  )
}
