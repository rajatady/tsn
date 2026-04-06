/**
 * Card primitive: padding, radius, shadow, colors, nesting
 *
 * Tests Card geometry under varying padding, corner radius,
 * shadow levels, arbitrary background colors, and nested cards.
 * Cards are VStacks with bg + rounded + padding — the geometry
 * test verifies inner content positioning matches the browser.
 */
export function CardDeepCase() {
  return (
    <VStack testId="root" className="gap-4 w-[500] bg-zinc-950 p-4">
      <Card testId="card-p3" className="rounded-xl bg-zinc-800 p-3">
        <Card testId="inner-p3" className="h-[30] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-p5" className="rounded-xl bg-zinc-800 p-5">
        <Card testId="inner-p5" className="h-[30] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-px4-py2" className="rounded-xl bg-zinc-800 px-4 py-2">
        <Card testId="inner-px4" className="h-[30] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-r-sm" className="rounded-sm bg-zinc-800 p-3">
        <Card testId="inner-r-sm" className="h-[20] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-r-2xl" className="rounded-2xl bg-zinc-800 p-3">
        <Card testId="inner-r-2xl" className="h-[20] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-shadow" className="rounded-xl bg-zinc-800 p-4 shadow-lg">
        <Card testId="inner-shadow" className="h-[30] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-hex" className="rounded-xl bg-[#2F2823] p-4">
        <Card testId="inner-hex" className="h-[30] rounded bg-zinc-700" />
      </Card>
      <Card testId="card-nested" className="rounded-2xl bg-zinc-800 p-4">
        <VStack testId="nested-inner" className="gap-3">
          <Card testId="nested-a" className="rounded-xl bg-zinc-700 p-3">
            <Card testId="deep-a" className="h-[24] rounded bg-zinc-600" />
          </Card>
          <Card testId="nested-b" className="rounded-xl bg-zinc-700 p-3">
            <Card testId="deep-b" className="h-[24] rounded bg-zinc-600" />
          </Card>
        </VStack>
      </Card>
    </VStack>
  )
}
