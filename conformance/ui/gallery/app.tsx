import { useStore } from '../../../packages/tsn-ui/src/react'
import { suiteDescriptionById, suiteLabelById } from '../registry'
import { ConformanceSidebar } from './sidebar'
import { incrementConformanceCounter, initConformanceGallery, resetConformanceDemo } from './state'
import { LayoutConformanceScreen } from './screens/layout'
import { ContentConformanceScreen } from './screens/content'
import { InputsConformanceScreen } from './screens/inputs'
import { MediaConformanceScreen } from './screens/media'
import { DataConformanceScreen } from './screens/data'

function ConformanceHeader() {
  const [suiteId, _setSuiteId] = useStore<string>('ui-conformance:suite', 'layout')
  const [query, _setQuery] = useStore<string>('ui-conformance:query', '')
  const [counter, _setCounter] = useStore<number>('ui-conformance:counter', 0)
  const [lastAction, _setLastAction] = useStore<string>('ui-conformance:last-action', 'idle')
  const suiteLabel: string = suiteLabelById(suiteId)
  const suiteDescription: string = suiteDescriptionById(suiteId)
  let queryText: string = 'Query: empty'
  if (query.length > 0) queryText = 'Query: ' + query
  const counterText: string = 'Counter ' + counter
  const lastActionText: string = 'Last action: ' + lastAction

  return (
    <VStack testId="shell.header" className="gap-2">
      <HStack className="gap-3">
        <VStack className="gap-0">
          <Text className="text-4xl font-bold">{suiteLabel}</Text>
          <Text className="text-sm text-zinc-400">{suiteDescription}</Text>
        </VStack>
        <Spacer />
        <Card className="rounded-xl bg-zinc-800">
          <VStack className="gap-2">
            <Text className="text-xs text-zinc-500">LIVE STATE</Text>
            <Text testId="shell.query" className="text-sm font-bold">{queryText}</Text>
            <Text testId="shell.counter" className="text-sm font-bold">{counterText}</Text>
            <Text testId="shell.last-action" className="text-sm font-bold">{lastActionText}</Text>
            <HStack className="gap-2">
              <Button testId="shell.increment" variant="primary" onClick={incrementConformanceCounter}>Increment Counter</Button>
              <Button testId="shell.reset" variant="link" onClick={resetConformanceDemo}>Reset Demo</Button>
            </HStack>
          </VStack>
        </Card>
      </HStack>
      <Divider />
    </VStack>
  )
}

function ConformanceContent() {
  const [suiteId, _setSuiteId] = useStore<string>('ui-conformance:suite', 'layout')
  if (suiteId === 'content') return <ContentConformanceScreen />
  if (suiteId === 'inputs') return <InputsConformanceScreen />
  if (suiteId === 'media') return <MediaConformanceScreen />
  if (suiteId === 'data') return <DataConformanceScreen />
  return <LayoutConformanceScreen />
}

export function initConformanceApp(): void {
  initConformanceGallery()
}

export function App() {
  return (
    <Window title="UI Gallery" width={1480} height={980} dark subtitle="TSN provider conformance">
      <HStack className="flex-1 gap-3 bg-black p-2">
        <ConformanceSidebar />
        <VStack className="flex-1 gap-0 bg-zinc-950 rounded-xl">
          <Scroll testId="shell.main-scroll" className="flex-1 overflow-y-auto">
            <VStack className="px-8 py-7">
              <VStack testId="shell.content-rail" className="max-w-[1180] mx-auto gap-7">
                <ConformanceHeader />
                <ConformanceContent />
              </VStack>
            </VStack>
          </Scroll>
        </VStack>
      </HStack>
    </Window>
  )
}
