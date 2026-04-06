/**
 * Text primitive: text inside padded card containers
 *
 * This is the core visual pattern in every StrictTS app:
 * eyebrow label + heading + body text inside a padded Card.
 * Tests that vertical spacing, padding, and text sizing
 * interact correctly to produce the right total card height.
 */
export function TextInCardCase() {
  return (
    <VStack testId="root" className="gap-4 w-[500] bg-zinc-900 p-4">
      <Card testId="card-simple" className="rounded-2xl bg-zinc-800 p-5">
        <VStack testId="inner-simple" className="gap-2">
          <Text testId="eyebrow-1" className="text-xs text-zinc-400 uppercase tracking-wide">Category</Text>
          <Text testId="heading-1" className="text-2xl font-bold tracking-tight">Section heading</Text>
          <Text testId="body-1" className="text-sm text-zinc-400">Supporting body text that provides context</Text>
        </VStack>
      </Card>
      <Card testId="card-hero" className="rounded-2xl bg-zinc-800 p-6">
        <VStack testId="inner-hero" className="gap-3">
          <Text testId="eyebrow-2" className="text-xs text-zinc-400 uppercase tracking-wide">Featured</Text>
          <Text testId="heading-2" className="text-4xl font-semibold leading-tight tracking-tight">Hero heading</Text>
          <Text testId="body-2" className="text-base text-zinc-400 leading-relaxed">Body copy below the heading.</Text>
        </VStack>
      </Card>
      <Card testId="card-compact" className="rounded-xl bg-zinc-800 px-4 py-3">
        <HStack testId="inner-compact" className="items-center gap-3">
          <Card testId="avatar" className="w-[40] h-[40] rounded-full bg-zinc-700" />
          <VStack testId="compact-text" className="flex-1 gap-0">
            <Text testId="name" className="text-sm font-semibold">User Name</Text>
            <Text testId="meta" className="text-xs text-zinc-500">2 hours ago</Text>
          </VStack>
        </HStack>
      </Card>
    </VStack>
  )
}
