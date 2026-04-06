import { useStore } from '../../../../packages/tsn-ui/src/react'
import { onConformanceInput, onConformanceSearch, resetConformanceDemo } from '../state'

export function InputsConformanceScreen() {
  const [query, _setQuery] = useStore<string>('ui-conformance:query', '')
  const [inputValue, _setInputValue] = useStore<string>('ui-conformance:input', 'preset text')
  const [counter, _setCounter] = useStore<number>('ui-conformance:counter', 0)

  let queryText: string = 'Query: empty'
  if (query.length > 0) queryText = 'Query: ' + query
  const inputText: string = 'Input: ' + inputValue
  const counterText: string = 'Counter ' + counter

  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Input and Interaction Primitives</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Search testId="inputs.search" value={query} placeholder="Search shared state" onChange={onConformanceSearch} className="w-[320]" />
          <Input testId="inputs.input" value={inputValue} placeholder="Input primitive" onChange={onConformanceInput} className="w-[320]" />
          <Text testId="inputs.query-mirror" className="text-2xl font-bold">{queryText}</Text>
          <Text testId="inputs.input-mirror" className="text-2xl font-bold">{inputText}</Text>
          <Text testId="inputs.counter" className="text-2xl font-bold">{counterText}</Text>
          <Button testId="inputs.reset" variant="link" onClick={resetConformanceDemo}>Reset Demo</Button>
        </VStack>
      </Card>
    </VStack>
  )
}
