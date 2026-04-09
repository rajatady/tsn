export function TextareaDeepCase() {
  return (
    <VStack testId="root" className="gap-4 w-[520] h-[320] bg-zinc-900 p-4">
      <TextArea testId="textarea-main" placeholder="Write release notes..." className="w-[420] h-[120]" />
      <HStack testId="row-secondary" className="items-end gap-3">
        <TextArea testId="textarea-side" placeholder="Short note..." className="w-[240] h-[84]" />
        <View testId="action" className="w-[96] h-[40] rounded-lg bg-zinc-700" />
      </HStack>
    </VStack>
  )
}
