/**
 * Text primitive: alignment and transform
 *
 * Tests text-left/center/right inside fixed-width containers,
 * and uppercase/lowercase transforms. The geometry check is on
 * the container positions, not the text rendering itself.
 */
export function TextAlignTransformCase() {
  return (
    <VStack testId="root" className="gap-3 w-[400] bg-zinc-900 p-4">
      <Card testId="align-left" className="w-[360] h-[40] rounded-xl bg-zinc-800 p-2">
        <Text testId="t-left" className="text-base text-left">Left aligned text</Text>
      </Card>
      <Card testId="align-center" className="w-[360] h-[40] rounded-xl bg-zinc-800 p-2">
        <Text testId="t-center" className="text-base text-center">Center aligned text</Text>
      </Card>
      <Card testId="align-right" className="w-[360] h-[40] rounded-xl bg-zinc-800 p-2">
        <Text testId="t-right" className="text-base text-right">Right aligned text</Text>
      </Card>
      <Divider testId="sep" />
      <Card testId="upper-card" className="w-[360] h-[40] rounded-xl bg-zinc-800 p-2">
        <Text testId="t-upper" className="text-xs uppercase tracking-wide">Uppercase eyebrow label</Text>
      </Card>
      <Card testId="lower-card" className="w-[360] h-[40] rounded-xl bg-zinc-800 p-2">
        <Text testId="t-lower" className="text-base lowercase">LOWERCASED Text Here</Text>
      </Card>
    </VStack>
  )
}
