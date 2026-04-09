import { useStore } from '../../../../packages/tsn-ui/src/react'
import { onConformanceCheckbox, onConformanceInput, onConformanceRadio, onConformanceSearch, onConformanceSelect, onConformanceSwitch, onConformanceTextArea, resetConformanceDemo } from '../state'

export function InputsConformanceScreen() {
  const [query, _setQuery] = useStore<string>('ui-conformance:query', '')
  const [inputValue, _setInputValue] = useStore<string>('ui-conformance:input', 'preset text')
  const [textareaValue, _setTextareaValue] = useStore<string>('ui-conformance:textarea', 'line one\nline two')
  const [selectValue, _setSelectValue] = useStore<string>('ui-conformance:select', 'Medium')
  const [checkboxValue, _setCheckboxValue] = useStore<boolean>('ui-conformance:checkbox', true)
  const [radioValue, _setRadioValue] = useStore<boolean>('ui-conformance:radio', false)
  const [switchValue, _setSwitchValue] = useStore<boolean>('ui-conformance:switch', true)
  const [counter, _setCounter] = useStore<number>('ui-conformance:counter', 0)

  let queryText: string = 'Query: empty'
  if (query.length > 0) queryText = 'Query: ' + query
  const inputText: string = 'Input: ' + inputValue
  const textareaText: string = 'TextArea: ' + textareaValue
  const selectText: string = 'Select: ' + selectValue
  const checkboxText: string = checkboxValue ? 'Checkbox: on' : 'Checkbox: off'
  const radioText: string = radioValue ? 'Radio: on' : 'Radio: off'
  const switchText: string = switchValue ? 'Switch: on' : 'Switch: off'
  const counterText: string = 'Counter ' + counter

  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Input and Interaction Primitives</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Search testId="inputs.search" value={query} placeholder="Search shared state" onChange={onConformanceSearch} className="w-[320]" />
          <Input testId="inputs.input" value={inputValue} placeholder="Input primitive" onChange={onConformanceInput} className="w-[320]" />
          <TextArea testId="inputs.textarea" value={textareaValue} placeholder="TextArea primitive" onChange={onConformanceTextArea} className="w-[320] h-[96]" />
          <HStack className="gap-4 items-center">
            <Checkbox testId="inputs.checkbox" checked={checkboxValue} label="Enable sync" onChange={onConformanceCheckbox} />
            <Radio testId="inputs.radio" checked={radioValue} label="Primary" onChange={onConformanceRadio} />
            <Switch testId="inputs.switch" checked={switchValue} onChange={onConformanceSwitch} />
            <Select testId="inputs.select" value={selectValue} options={['Low', 'Medium', 'High']} onChange={onConformanceSelect} className="w-[140]" />
          </HStack>
          <Text testId="inputs.query-mirror" className="text-2xl font-bold">{queryText}</Text>
          <Text testId="inputs.input-mirror" className="text-2xl font-bold">{inputText}</Text>
          <Text testId="inputs.textarea-mirror" className="text-2xl font-bold">{textareaText}</Text>
          <Text testId="inputs.select-mirror" className="text-2xl font-bold">{selectText}</Text>
          <Text testId="inputs.checkbox-mirror" className="text-2xl font-bold">{checkboxText}</Text>
          <Text testId="inputs.radio-mirror" className="text-2xl font-bold">{radioText}</Text>
          <Text testId="inputs.switch-mirror" className="text-2xl font-bold">{switchText}</Text>
          <Text testId="inputs.counter" className="text-2xl font-bold">{counterText}</Text>
          <Button testId="inputs.reset" variant="link" onClick={resetConformanceDemo}>Reset Demo</Button>
        </VStack>
      </Card>
    </VStack>
  )
}
