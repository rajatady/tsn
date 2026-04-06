/**
 * Text primitive: line-height and padding interaction
 *
 * This is the #1 visual complaint: text inside padded containers with
 * different line-heights produces different vertical spacing. Tests
 * leading-none through leading-loose at text-2xl inside cards with padding.
 *
 * The geometry oracle must verify that the total height (text + padding)
 * matches what the browser produces for the same Tailwind classes.
 */
export function TextLineheightCase() {
  return (
    <VStack testId="root" className="gap-3 w-[500] bg-zinc-900 p-4">
      <Card testId="card-none" className="rounded-xl bg-zinc-800 p-4">
        <Text testId="text-none" className="text-2xl font-semibold leading-none">Leading none: tight heading text</Text>
      </Card>
      <Card testId="card-tight" className="rounded-xl bg-zinc-800 p-4">
        <Text testId="text-tight" className="text-2xl font-semibold leading-tight">Leading tight: slightly more space</Text>
      </Card>
      <Card testId="card-snug" className="rounded-xl bg-zinc-800 p-4">
        <Text testId="text-snug" className="text-2xl font-semibold leading-snug">Leading snug: a comfortable reading</Text>
      </Card>
      <Card testId="card-normal" className="rounded-xl bg-zinc-800 p-4">
        <Text testId="text-normal" className="text-2xl font-semibold leading-normal">Leading normal: default browser line</Text>
      </Card>
      <Card testId="card-relaxed" className="rounded-xl bg-zinc-800 p-4">
        <Text testId="text-relaxed" className="text-2xl font-semibold leading-relaxed">Leading relaxed: spacious reading</Text>
      </Card>
    </VStack>
  )
}
