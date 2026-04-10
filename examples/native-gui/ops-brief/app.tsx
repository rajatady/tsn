import { useStore } from '../../../packages/tsn-ui/src/react'
import {
  loadOpsBriefCache,
  refreshOpsBrief,
  startOpsBriefPolling,
  stopOpsBriefPolling,
} from './state'

export function App() {
  const [status, _setStatus] = useStore<string>('ops-brief:status', 'Idle. Load cache or refresh from GitHub.')
  const [payload, _setPayload] = useStore<string>('ops-brief:payload', 'No snapshot loaded yet.')
  const [etag, _setEtag] = useStore<string>('ops-brief:etag', '')
  const [error, _setError] = useStore<string>('ops-brief:error', '')
  const [busy, _setBusy] = useStore<boolean>('ops-brief:busy', false)
  const [polling, _setPolling] = useStore<boolean>('ops-brief:polling', false)

  let preview: string = payload
  if (preview.length > 540) {
    preview = preview.slice(0, 540) + '...'
  }

  let statusView: JSX.Element = <Text className="text-sm font-medium text-emerald-300">{status}</Text>
  if (busy) {
    statusView = <Text className="text-sm font-medium text-amber-300">{status}</Text>
  }
  if (error.length > 0) {
    statusView = <Text className="text-sm font-medium text-rose-300">{status}</Text>
  }

  let pollingText = 'Polling paused'
  if (polling) pollingText = 'Polling every 15s'

  let etagText = 'No ETag yet'
  if (etag.length > 0) etagText = 'ETag ' + etag

  return (
    <Window title="TSN Ops Brief" width={1180} height={780} dark subtitle="Native async fetch + cache + timers">
      <HStack className="flex-1 bg-[#07131a]">
        <VStack className="w-[320] border-r border-white/10 bg-[#0c1a22] p-6">
          <Text className="text-xs font-medium uppercase tracking-[2] text-cyan-300/60">Hosted async</Text>
          <Text className="mt-3 text-[32] font-semibold leading-[34] text-white">Ops Brief</Text>
          <Text className="mt-3 text-sm leading-6 text-cyan-50/70">
            Refreshes a remote JSON brief, keeps a native cache on disk, and runs inside a macOS window with TSN-owned async I/O.
          </Text>

          <VStack className="mt-6 gap-3">
            <Button testId="ops.refresh" variant="primary" onClick={refreshOpsBrief}>Refresh now</Button>
            <Button testId="ops.cache" variant="ghost" onClick={loadOpsBriefCache}>Load cached snapshot</Button>
            <Button testId="ops.start" variant="ghost" onClick={startOpsBriefPolling}>Start polling</Button>
            <Button testId="ops.stop" variant="ghost" onClick={stopOpsBriefPolling}>Stop polling</Button>
          </VStack>

          <VStack className="mt-8 gap-3">
            <View className="rounded-[20] border border-white/10 bg-white/[0.04] p-4">
              <VStack className="gap-2">
                <Text className="text-xs font-medium uppercase tracking-[2] text-cyan-300/60">State</Text>
                {statusView}
                <Text className="text-sm text-white/70">{pollingText}</Text>
                <Text className="text-sm text-white/55">{etagText}</Text>
              </VStack>
            </View>

            <View className="rounded-[20] border border-white/10 bg-white/[0.04] p-4">
              <VStack className="gap-2">
                <Text className="text-xs font-medium uppercase tracking-[2] text-cyan-300/60">Error</Text>
                <Text className="text-sm leading-6 text-white/70">
                  {error.length > 0 ? error : 'No current async errors.'}
                </Text>
              </VStack>
            </View>

            <View className="rounded-[20] border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
              <VStack className="gap-2">
                <Text className="text-xs font-medium uppercase tracking-[2] text-cyan-300/80">Why this is TSN-native</Text>
                <Text className="text-sm leading-6 text-cyan-50/80">
                  Idiomatic TypeScript syntax is driving a native AppKit window, libuv timers, hosted fetch, and disk-backed caching in one runtime.
                </Text>
              </VStack>
            </View>
          </VStack>
        </VStack>

        <Scroll className="flex-1 overflow-y-auto">
          <VStack className="gap-4 p-6">
            <View className="rounded-[24] border border-white/10 bg-[#102431] p-6">
              <VStack className="gap-3">
                <Text className="text-xs font-medium uppercase tracking-[2] text-cyan-300/60">Latest payload</Text>
                <Text className="text-base leading-7 text-cyan-50/90">{preview}</Text>
              </VStack>
            </View>

            <View className="rounded-[24] border border-white/10 bg-[#0e1d27] p-6">
              <VStack className="gap-3">
                <Text className="text-xs font-medium uppercase tracking-[2] text-cyan-300/60">What the state layer does</Text>
                <Text className="text-sm leading-6 text-white/70">
                  1. Sends a GitHub API request with explicit request headers.
                </Text>
                <Text className="text-sm leading-6 text-white/70">
                  2. Reads response headers like ETag for cache-aware revalidation.
                </Text>
                <Text className="text-sm leading-6 text-white/70">
                  3. Writes the latest body to disk so the window can recover offline.
                </Text>
                <Text className="text-sm leading-6 text-white/70">
                  4. Uses try/catch/finally so busy state and fallback loading stay predictable.
                </Text>
              </VStack>
            </View>
          </VStack>
        </Scroll>
      </HStack>
    </Window>
  )
}
