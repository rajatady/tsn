import {
  applySelectedFiles,
  closeAttachDialog,
  toggleFileAnalytics,
  toggleFileHandoff,
  toggleFileNotes,
  toggleFileRoadmap,
  toggleFileScript,
  toggleFileWireframe,
} from './state'

export function AttachDialog(open: boolean, roadmap: boolean, script: boolean, notes: boolean, analytics: boolean, wireframe: boolean, handoff: boolean) {
  if (!open) return <View />

  return (
    <VStack testId="attach-dialog" className="absolute inset-0 items-center justify-center bg-black/50 p-6">
      <VStack testId="attach-dialog-card" className="w-[760] gap-0 rounded-[28] border border-white/10 bg-[#18181b]">
        <HStack className="items-center justify-between border-b border-white/10 p-6">
          <VStack className="gap-1">
            <Text className="text-lg font-medium text-zinc-50">Attach files</Text>
            <Text className="text-xs text-zinc-500">A simple local file picker state.</Text>
          </VStack>
          <Button testId="attach-dialog-close" variant="ghost" onClick={closeAttachDialog}>✕</Button>
        </HStack>
        <VStack testId="file-grid" className="gap-3 p-6">
          <HStack className="items-center gap-3 rounded-[16] border border-white/10 bg-[#232327] p-4">
            <Checkbox checked={roadmap} onChange={toggleFileRoadmap} label="" />
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">roadmap-q3.pdf</Text>
              <Text className="text-xs text-zinc-500">Board update</Text>
            </VStack>
          </HStack>
          <HStack className="items-center gap-3 rounded-[16] border border-white/10 bg-[#232327] p-4">
            <Checkbox checked={script} onChange={toggleFileScript} label="" />
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">demo-script.md</Text>
              <Text className="text-xs text-zinc-500">Launch draft</Text>
            </VStack>
          </HStack>
          <HStack className="items-center gap-3 rounded-[16] border border-white/10 bg-[#232327] p-4">
            <Checkbox checked={notes} onChange={toggleFileNotes} label="" />
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">notes.txt</Text>
              <Text className="text-xs text-zinc-500">Loose notes</Text>
            </VStack>
          </HStack>
          <HStack className="items-center gap-3 rounded-[16] border border-white/10 bg-[#232327] p-4">
            <Checkbox checked={analytics} onChange={toggleFileAnalytics} label="" />
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">analytics.csv</Text>
              <Text className="text-xs text-zinc-500">Retention sample</Text>
            </VStack>
          </HStack>
          <HStack className="items-center gap-3 rounded-[16] border border-white/10 bg-[#232327] p-4">
            <Checkbox checked={wireframe} onChange={toggleFileWireframe} label="" />
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">wireframe.png</Text>
              <Text className="text-xs text-zinc-500">UI mock</Text>
            </VStack>
          </HStack>
          <HStack className="items-center gap-3 rounded-[16] border border-white/10 bg-[#232327] p-4">
            <Checkbox checked={handoff} onChange={toggleFileHandoff} label="" />
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">handoff.docx</Text>
              <Text className="text-xs text-zinc-500">Requirements</Text>
            </VStack>
          </HStack>
        </VStack>
        <HStack className="items-center justify-between border-t border-white/10 p-6">
          <Text className="text-xs text-zinc-500">Selected files appear above the composer.</Text>
          <HStack className="gap-2">
            <Button onClick={closeAttachDialog} variant="ghost">Cancel</Button>
            <Button onClick={applySelectedFiles} variant="primary">Attach</Button>
          </HStack>
        </HStack>
      </VStack>
    </VStack>
  )
}
